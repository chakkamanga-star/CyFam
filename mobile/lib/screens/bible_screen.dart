import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:share_plus/share_plus.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../widgets/shimmer_box.dart';

class BibleScreen extends StatefulWidget {
  const BibleScreen({super.key});

  @override
  State<BibleScreen> createState() => _BibleScreenState();
}

class _BibleScreenState extends State<BibleScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;

  static const Map<String, _SeasonStyle> _seasons = {
    'denha':        _SeasonStyle(color: Color(0xFF38BDF8), icon: '💧'),
    'fast':         _SeasonStyle(color: Color(0xFFA78BFA), icon: '🕯️'),
    'sauma':        _SeasonStyle(color: Color(0xFFA78BFA), icon: '🕯️'),
    'resurrection': _SeasonStyle(color: Color(0xFFFBBF24), icon: '☀️'),
    'qyamtha':      _SeasonStyle(color: Color(0xFFFBBF24), icon: '☀️'),
    'apostles':     _SeasonStyle(color: Color(0xFF4ADE80), icon: '⚓'),
    'annunciation': _SeasonStyle(color: Color(0xFF2DD4BF), icon: '⭐'),
    'nativity':     _SeasonStyle(color: Color(0xFF2DD4BF), icon: '⭐'),
  };

  _SeasonStyle get _style {
    final season = (_data?['season'] ?? '').toString().toLowerCase();
    for (final entry in _seasons.entries) {
      if (season.contains(entry.key)) return entry.value;
    }
    return const _SeasonStyle(color: AppTheme.amber, icon: '📖');
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  // Normalize a readings list from API — handles both { text } and { description } keys
  List<Map<String, dynamic>> _normalizeReadings(dynamic raw) {
    if (raw == null) return [];
    return (raw as List).map((r) {
      final m = r as Map<String, dynamic>;
      return {
        'label':       m['label'] ?? '',
        'reference':   m['reference'] ?? '',
        'description': m['text'] ?? m['description'] ?? '',
      };
    }).toList();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService().getBibleReadings();

      // API returns flat camelCase: { liturgicalDay, season, colour, readings: [{label, reference, text}] }
      // Normalise everything to snake_case so _buildContent() works regardless of future API changes.
      Map<String, dynamic>? d;
      if (raw.containsKey('data') && raw['data'] != null) {
        // Wrapped format: { data: { ... } }
        final inner = raw['data'] as Map<String, dynamic>;
        d = {
          'liturgical_day': inner['liturgical_day'] ?? inner['liturgicalDay'] ?? '',
          'season':         inner['season'] ?? '',
          'colour':         inner['colour'] ?? inner['color'] ?? '#10b981',
          'feasts':         inner['feasts'] ?? [],
          'readings':       _normalizeReadings(inner['readings']),
          'source':         inner['source'] ?? '',
          'source_url':     inner['source_url'] ?? inner['sourceUrl'],
        };
      } else if (raw.isNotEmpty && raw.containsKey('rite')) {
        // Flat camelCase format (current API)
        d = {
          'liturgical_day': raw['liturgicalDay'] ?? raw['liturgical_day'] ?? '',
          'season':         raw['season'] ?? '',
          'colour':         raw['colour'] ?? raw['color'] ?? '#10b981',
          'feasts':         raw['feasts'] ?? [],
          'readings':       _normalizeReadings(raw['readings']),
          'source':         raw['source'] ?? '',
          'source_url':     raw['sourceUrl'] ?? raw['source_url'],
        };
      }

      // Show empty state if readings are genuinely missing
      if (mounted) setState(() { _data = d; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final style = _style;
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        backgroundColor: AppTheme.bgDark,
        title: Text('Bible & Readings', style: GoogleFonts.nunito(
          fontWeight: FontWeight.w800, color: AppTheme.textPrimary, fontSize: 18)),
        actions: [
          if (_data != null)
            IconButton(
              icon: const Icon(CupertinoIcons.share),
              onPressed: _share,
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.bgCard,
        onRefresh: _load,
        child: _loading
            ? _shimmer()
            : _data == null
                ? _emptyState()
                : _buildContent(style),
      ),
    );
  }

  Widget _buildContent(_SeasonStyle style) {
    final season  = _data?['season'] ?? '';
    final day     = _data?['liturgical_day'] ?? '';
    final feasts  = (_data?['feasts'] as List?) ?? [];
    final readings = (_data?['readings'] as List?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Season card ──────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                style.color.withOpacity(0.2),
                style.color.withOpacity(0.05),
              ],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: style.color.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Text(style.icon, style: const TextStyle(fontSize: 28)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: style.color.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(season, style: TextStyle(
                          fontSize: 10, color: style.color,
                          fontWeight: FontWeight.w700, fontFamily: 'Inter',
                        )),
                      ),
                      const SizedBox(height: 6),
                      Text(day, style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary, fontFamily: 'Inter',
                        letterSpacing: -0.3,
                      )),
                    ],
                  ),
                ),
              ]),

              // Feasts
              if (feasts.isNotEmpty) ...[
                const SizedBox(height: 14),
                const Divider(color: Color(0x20FFFFFF), height: 1),
                const SizedBox(height: 14),
                const Text('Feast Days', style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w700,
                  color: AppTheme.textMuted, fontFamily: 'Inter',
                  letterSpacing: 0.5,
                )),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6, runSpacing: 6,
                  children: feasts.map<Widget>((f) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: style.color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(f.toString(), style: TextStyle(
                      fontSize: 11, color: style.color, fontFamily: 'Inter',
                    )),
                  )).toList(),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 20),

        // ── Scripture readings ───────────────────────────────────
        const Text('Today\'s Readings', style: TextStyle(
          fontSize: 14, fontWeight: FontWeight.w700,
          color: AppTheme.textPrimary, fontFamily: 'Inter',
        )),
        const SizedBox(height: 12),

        ...readings.asMap().entries.map((e) {
          final i  = e.key;
          final r  = e.value as Map<String, dynamic>;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Container(
                    width: 24, height: 24,
                    decoration: BoxDecoration(
                      color: style.color.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Center(child: Text('${i + 1}', style: TextStyle(
                      fontSize: 11, color: style.color,
                      fontWeight: FontWeight.w700, fontFamily: 'Inter',
                    ))),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if ((r['label'] ?? '').isNotEmpty)
                          Text(r['label'].toString(), style: TextStyle(
                            fontSize: 10, color: style.color.withOpacity(0.8),
                            fontWeight: FontWeight.w700, fontFamily: 'Inter',
                            letterSpacing: 0.5,
                          )),
                        Text(r['reference'] ?? '', style: TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w700,
                          color: style.color, fontFamily: 'Inter',
                        )),
                      ],
                    ),
                  ),
                ]),
                if ((r['description'] ?? '').isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(r['description'], style: const TextStyle(
                    fontSize: 13, color: AppTheme.textSub,
                    fontFamily: 'Inter', height: 1.5,
                  )),
                ],
              ],
            ),
          );
        }).toList(),

        const SizedBox(height: 100),
      ],
    );
  }

  Widget _emptyState() => ListView(
    padding: const EdgeInsets.all(28),
    children: [
      const SizedBox(height: 40),
      Center(child: Container(
        width: 80, height: 80,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          color: AppTheme.amber.withOpacity(0.12),
          border: Border.all(color: AppTheme.amber.withOpacity(0.25)),
        ),
        child: const Center(child: Text('📖', style: TextStyle(fontSize: 36))),
      )),
      const SizedBox(height: 20),
      Text('No Reading for Today',
        textAlign: TextAlign.center,
        style: GoogleFonts.nunito(
          fontSize: 18, fontWeight: FontWeight.w800,
          color: AppTheme.textPrimary)),
      const SizedBox(height: 8),
      Text(
        'Today\'s Bible reading hasn\'t been uploaded yet. Check back later or pull down to refresh.',
        textAlign: TextAlign.center,
        style: GoogleFonts.nunito(
          fontSize: 13, color: AppTheme.textMuted, height: 1.6)),
      const SizedBox(height: 28),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(children: [
          Text('Daily Verse', style: GoogleFonts.nunito(
            fontSize: 11, fontWeight: FontWeight.w700,
            color: AppTheme.amber, letterSpacing: 0.5)),
          const SizedBox(height: 10),
          Text(
            '"I can do all things through Christ who strengthens me."',
            textAlign: TextAlign.center,
            style: GoogleFonts.nunito(
              fontSize: 15, fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary, height: 1.5,
              fontStyle: FontStyle.italic)),
          const SizedBox(height: 6),
          Text('— Philippians 4:13', style: GoogleFonts.nunito(
            fontSize: 12, color: AppTheme.amber, fontWeight: FontWeight.w700)),
        ]),
      ),
    ],
  );

  Widget _shimmer() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      ShimmerBox(height: 160, radius: 20),
      const SizedBox(height: 20),
      ShimmerBox(height: 90, radius: 14),
      const SizedBox(height: 10),
      ShimmerBox(height: 90, radius: 14),
    ],
  );

  void _share() {
    final day = _data?['liturgical_day'] ?? '';
    final season = _data?['season'] ?? '';
    final readings = (_data?['readings'] as List?) ?? [];
    final text = readings.map((r) => '📖 ${r['reference']}').join('\n');
    Share.share('$season — $day\n\n$text\n\n— CY Family App');
  }
}

class _SeasonStyle {
  final Color color;
  final String icon;
  const _SeasonStyle({required this.color, required this.icon});
}
