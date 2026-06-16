import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, isNextResponse } from '@/lib/auth';
import { extractSheetId, previewSheet, autoDetectColumns, extractDriveFileId, downloadDriveFile } from '@/lib/google-sheets';
import { uploadToR2, generateKey } from '@/lib/r2';
import { normalizeIndianPhone } from '@/lib/phone';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['Super Admin', 'Secretary']);
  if (isNextResponse(auth)) return auth;

  const { url, sheetId: directId, columnMap, conflictMode, action } = await req.json();

  // --- STEP 1: Preview sheet ---
  if (action === 'preview') {
    const sheetId = directId || (url ? extractSheetId(url) : null);
    if (!sheetId) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
    }

    const rows = await previewSheet(sheetId);
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Could not read sheet. Make sure it is shared with the service account email.' },
        { status: 400 }
      );
    }

    const headers = rows[0] as string[];
    const detectedMap = autoDetectColumns(headers);
    const preview = rows.slice(1, 6); // first 5 data rows

    return NextResponse.json({ sheetId, headers, detectedMap, preview, totalRows: rows.length - 1 });
  }

  // --- STEP 2: Import ---
  if (action === 'import') {
    const sheetId = directId;
    if (!sheetId || !columnMap) {
      return NextResponse.json({ error: 'sheetId and columnMap required' }, { status: 400 });
    }

    const rows = await previewSheet(sheetId);
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'No data rows found' }, { status: 400 });
    }

    const headers = rows[0] as string[];
    const dataRows = rows.slice(1);

    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (const row of dataRows) {
      try {
        const rowData: Record<string, string> = {};
        headers.forEach((h, i) => {
          const field = columnMap[i];
          if (field && field !== 'ignore') {
            rowData[field] = (row[i] as string) || '';
          }
        });

        if (!rowData.phone) {
          results.errors.push(`Row missing phone: ${rowData.full_name || '?'}`);
          continue;
        }

        const phone = normalizeIndianPhone(rowData.phone);
        if (!phone) {
          results.errors.push(`Invalid/non-Indian phone "${rowData.phone}" for: ${rowData.full_name || '?'}`);
          results.skipped++;
          continue;
        }

        // ── Resolve multiple teams (comma or semicolon separated) ──
        const teamNames = rowData.team
          ? rowData.team.split(/[,;]/).map(t => t.trim()).filter(Boolean)
          : [];

        const resolvedTeamIds: string[] = [];
        for (const teamName of teamNames) {
          const { data: team } = await supabaseAdmin
            .from('teams')
            .select('id')
            .ilike('name', `%${teamName}%`)
            .single();
          if (team?.id) resolvedTeamIds.push(team.id);
        }

        // Primary team = first match (kept in admins.team_id for backward compat)
        const team_id = resolvedTeamIds[0] ?? null;

        // Resolve photo: download from Google Drive → upload to R2
        let photo_url: string | null = null;
        if (rowData.photo_url) {
          const fileId = extractDriveFileId(rowData.photo_url);
          if (fileId) {
            const downloaded = await downloadDriveFile(fileId);
            if (downloaded) {
              const ext = downloaded.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
              const key = generateKey('member-photos', `drive_${fileId}.${ext}`);
              try {
                photo_url = await uploadToR2(downloaded.buffer, key, downloaded.mimeType);
              } catch {
                // R2 upload failed — leave photo_url null, don't fail the whole row
              }
            }
          }
        }

        const memberData = {
          name: rowData.full_name || 'Unknown',
          phone,
          email: rowData.email || null,
          dob: rowData.dob || null,
          team_id,
          photo_url,
        };

        const { data: existing } = await supabaseAdmin
          .from('admins')
          .select('id')
          .eq('phone', memberData.phone)
          .single();

        let memberId: string | null = null;

        if (existing) {
          if (conflictMode === 'skip') {
            results.skipped++;
            continue;
          } else if (conflictMode === 'overwrite') {
            await supabaseAdmin.from('admins').update(memberData).eq('id', existing.id);
            memberId = existing.id;
            results.imported++;
          }
        } else {
          const { data: inserted } = await supabaseAdmin
            .from('admins')
            .insert(memberData)
            .select('id')
            .single();
          memberId = inserted?.id ?? null;
          results.imported++;
        }

        // ── Insert all resolved teams into member_teams junction ──
        if (memberId && resolvedTeamIds.length > 0) {
          const rows = resolvedTeamIds.map(tid => ({ member_id: memberId, team_id: tid }));
          await supabaseAdmin
            .from('member_teams')
            .upsert(rows, { onConflict: 'member_id,team_id' })
            .then(({ error }) => {
              // Silently ignore if table doesn't exist yet (42P01)
              if (error && error.code !== '42P01') {
                results.errors.push(`member_teams insert failed for ${memberData.name}: ${error.message}`);
              }
            });
        }
      } catch (e) {
        results.errors.push(String(e));
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      admin_id: auth.id,
      admin_name: auth.name,
      action: 'IMPORT_MEMBERS',
      entity: 'admins',
      detail: `Imported ${results.imported}, skipped ${results.skipped}, errors ${results.errors.length}`,
    });

    return NextResponse.json({ success: true, ...results });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
