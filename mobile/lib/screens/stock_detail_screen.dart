import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/company.dart';
import '../providers/game_provider.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';
import '../widgets/trading_modal.dart';

class StockDetailScreen extends StatefulWidget {
  final CompanyModel company;

  const StockDetailScreen({super.key, required this.company});

  @override
  State<StockDetailScreen> createState() => _StockDetailScreenState();
}

class _StockDetailScreenState extends State<StockDetailScreen> {
  CompanyModel? _detailedCompany;
  bool _isLoading = true;
  String _selectedTimeframe = '1D';
  String _chartType = 'LINE'; // default to LINE like Stockbit screenshot 1, easily toggled to CANDLE
  String _selectedIndicator = 'MA';
  String _selectedSubTab = 'Orderbook';
  int? _scrubIndex;
  double? _scrubPrice;

  @override
  void initState() {
    super.initState();
    _fetchDetail();
  }

  void _onTimeframeChanged(String tf) {
    if (_selectedTimeframe == tf) return;
    setState(() {
      _selectedTimeframe = tf;
      _scrubIndex = null;
      _scrubPrice = null;
    });
    _fetchDetail(tf);
  }

  Future<void> _fetchDetail([String? range]) async {
    final tf = range ?? _selectedTimeframe;
    try {
      final detail = await ApiService.getCompanyDetail(widget.company.id, range: tf);
      if (mounted) {
        setState(() {
          _detailedCompany = detail ?? widget.company;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _detailedCompany = widget.company;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  List<PricePoint> _getCandlePoints(CompanyModel c) {
    if (c.isPreIpo) {
      final now = DateTime.now();
      return List.generate(24, (i) => PricePoint(
        open: c.basePrice,
        close: c.basePrice,
        high: c.basePrice,
        low: c.basePrice,
        price: c.basePrice,
        volume: 0,
        timestamp: now.subtract(Duration(minutes: (24 - i) * 5)),
      ));
    }

    if (c.history.isNotEmpty) {
      return c.history;
    }
    // Dynamic fallback multi-wave oscillations with authentic financial swing anchors
    final seed = c.symbol.hashCode + _selectedTimeframe.hashCode;
    final random = Random(seed);
    final List<PricePoint> generated = [];
    final steps = _selectedTimeframe == '1D' ? 24 : (_selectedTimeframe == '1W' ? 18 : 30);
    final isCritical = c.status == 'CRITICAL';
    final refPrice = c.basePrice;
    final startPrice = _selectedTimeframe == '1D'
        ? refPrice
        : (_selectedTimeframe == '1W'
            ? (isCritical ? refPrice * 1.25 : refPrice * 0.88)
            : (isCritical ? refPrice * 1.45 : refPrice * 0.78));

    final netChange = c.currentPrice - startPrice;
    final swingFactor = max(refPrice * 0.05, netChange.abs() * 0.25);

    final anchors = isCritical
        ? [
            {'t': 0.0, 'p': startPrice},
            {'t': 0.18, 'p': startPrice + (netChange * 0.25) - (swingFactor * 0.6)},
            {'t': 0.38, 'p': startPrice + (netChange * 0.15) + (swingFactor * 0.4)},
            {'t': 0.58, 'p': startPrice + (netChange * 0.60) - (swingFactor * 0.8)},
            {'t': 0.78, 'p': startPrice + (netChange * 0.50) + (swingFactor * 0.3)},
            {'t': 0.90, 'p': startPrice + (netChange * 0.95) - (swingFactor * 0.4)},
            {'t': 1.0, 'p': c.currentPrice},
          ]
        : [
            {'t': 0.0, 'p': startPrice},
            {'t': 0.18, 'p': startPrice + (netChange * 0.20) + (swingFactor * 0.5)},
            {'t': 0.36, 'p': startPrice + (netChange * 0.10) - (swingFactor * 0.35)},
            {'t': 0.55, 'p': startPrice + (netChange * 0.60) + (swingFactor * 0.7)},
            {'t': 0.75, 'p': startPrice + (netChange * 0.45) - (swingFactor * 0.3)},
            {'t': 0.88, 'p': startPrice + (netChange * 0.90) + (swingFactor * 0.4)},
            {'t': 1.0, 'p': c.currentPrice},
          ];

    double interpolateAnchors(double t) {
      if (t <= 0) return anchors.first['p']!;
      if (t >= 1) return anchors.last['p']!;
      for (int j = 0; j < anchors.length - 1; j++) {
        final a1 = anchors[j];
        final a2 = anchors[j + 1];
        if (t >= a1['t']! && t <= a2['t']!) {
          final segT = (t - a1['t']!) / (a2['t']! - a1['t']!);
          final smooth = segT * segT * (3 - 2 * segT);
          return a1['p']! + (a2['p']! - a1['p']!) * smooth;
        }
      }
      return c.currentPrice;
    }

    double prevClose = startPrice;
    final now = DateTime.now();

    for (int i = 0; i < steps; i++) {
      final isLast = (i == steps - 1);
      final isFirst = (i == 0);
      final t = i / (steps - 1);

      final double candleClose;
      if (isLast) {
        candleClose = c.currentPrice;
      } else if (isFirst) {
        candleClose = startPrice;
      } else {
        final basePriceAtT = interpolateAnchors(t);
        final microWave = sin(t * pi * 6.5 + (seed % 10)) * (refPrice * 0.012);
        final jitter = (random.nextDouble() - 0.5) * (refPrice * 0.016);
        candleClose = max(50.0, basePriceAtT + microWave + jitter);
      }

      final candleOpen = isFirst ? startPrice : prevClose;
      final spread = (candleClose - candleOpen).abs();
      final wickHigh = (random.nextDouble() * 0.45 + 0.15) * (spread + refPrice * 0.008);
      final wickLow = (random.nextDouble() * 0.45 + 0.15) * (spread + refPrice * 0.008);
      final candleHigh = max(candleOpen, candleClose) + wickHigh;
      final candleLow = max(50.0, min(candleOpen, candleClose) - wickLow);

      generated.add(PricePoint(
        open: candleOpen,
        close: candleClose,
        high: candleHigh,
        low: candleLow,
        price: candleClose,
        volume: 250 + random.nextInt(750),
        timestamp: now.subtract(Duration(minutes: (steps - i) * 5)),
      ));

      prevClose = candleClose;
    }
    return generated;
  }

  OrderbookModel _getFallbackOrderbook(CompanyModel c) {
    if (c.isPreIpo) {
      return OrderbookModel(
        bids: [OrderbookLevel(price: c.basePrice, lots: 1000)],
        offers: [],
        totalBidLots: 1000,
        totalOfferLots: 0,
        buyPressurePct: 100,
        sellPressurePct: 0,
      );
    }
    if (c.orderbook != null) return c.orderbook!;

    final tickSize = c.currentPrice >= 5000 ? 25 : (c.currentPrice >= 2000 ? 10 : 5);
    final List<OrderbookLevel> bids = [];
    final List<OrderbookLevel> offers = [];
    int totalBidLots = 0;
    int totalOfferLots = 0;

    final seed = c.symbol.codeUnits.fold(0, (a, b) => a + b);
    final bias = c.priceChangePct >= 0 ? 1.15 : 0.85;

    for (int i = 1; i <= 5; i++) {
      final bidPrice = max(50.0, (c.currentPrice - (i - 1) * tickSize).roundToDouble());
      final offerPrice = (c.currentPrice + i * tickSize).roundToDouble();

      final bidLots = ((450 + (i * 150) + ((seed * i) % 350)) * bias).round();
      final offerLots = ((450 + (i * 150) + (((seed + 7) * i) % 350)) * (2 - bias)).round();

      totalBidLots += bidLots;
      totalOfferLots += offerLots;

      bids.add(OrderbookLevel(price: bidPrice, lots: bidLots));
      offers.add(OrderbookLevel(price: offerPrice, lots: offerLots));
    }

    final total = totalBidLots + totalOfferLots;
    final buyPct = total > 0 ? ((totalBidLots / total) * 100).round() : 50;

    return OrderbookModel(
      bids: bids,
      offers: offers,
      totalBidLots: totalBidLots,
      totalOfferLots: totalOfferLots,
      buyPressurePct: buyPct,
      sellPressurePct: 100 - buyPct,
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    // Synchronize live ticker price from socket if available
    final liveCompany = provider.companies.firstWhere(
      (comp) => comp.id == widget.company.id,
      orElse: () => _detailedCompany ?? widget.company,
    );

    final c = _detailedCompany != null
        ? _detailedCompany!.copyWith(
            currentPrice: liveCompany.currentPrice,
            basePrice: liveCompany.basePrice,
            priceChangePct: liveCompany.priceChangePct,
            status: liveCompany.status,
            orderbook: liveCompany.orderbook ?? _detailedCompany!.orderbook,
          )
        : liveCompany;

    final isUp = c.priceChangePct >= 0;
    final nominalDiff = (c.currentPrice - c.basePrice).round();
    final candlePoints = _getCandlePoints(c);
    final chartPoints = candlePoints.map((e) => e.close).toList();
    final orderbook = _getFallbackOrderbook(c);

    // Calculate maximum volume in orderbook for visual relative bar width
    int maxOrderbookLots = 1;
    for (var b in orderbook.bids) {
      if (b.lots > maxOrderbookLots) maxOrderbookLots = b.lots;
    }
    for (var o in orderbook.offers) {
      if (o.lots > maxOrderbookLots) maxOrderbookLots = o.lots;
    }

    // Check user holding for this emiten
    final port = provider.portfolio;
    final matchingHoldings = port?.holdings.where((h) => h.companyId == c.id || h.symbol == c.symbol) ?? [];
    final matchingHolding = matchingHoldings.isNotEmpty ? matchingHoldings.first : null;
    final ownedLots = matchingHolding?.lotsOwned ?? 0;
    final ownedShares = matchingHolding != null
        ? (matchingHolding.totalShares > 0 ? matchingHolding.totalShares : ownedLots * 100)
        : 0;
    final avgBuyPrice = matchingHolding?.avgBuyPrice ?? 0.0;
    final totalInvested = ownedShares * avgBuyPrice;
    final currentHoldingVal = ownedShares * c.currentPrice;
    final profitLoss = currentHoldingVal - totalInvested;
    final profitLossPct = totalInvested > 0 ? ((profitLoss / totalInvested) * 100) : 0.0;
    final isHoldingProfit = profitLoss >= 0;
    final user = provider.user;
    final isOwner = user != null && c.ownerId != null && c.ownerId == user.id;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Text(
              c.symbol,
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                c.sector.toUpperCase(),
                style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: c.isPreIpo
                    ? const Color(0xFFF59E0B).withValues(alpha: 0.2)
                    : (c.isSeized
                        ? const Color(0xFFEF4444).withValues(alpha: 0.25)
                        : (c.isSuspended
                            ? const Color(0xFFEF4444).withValues(alpha: 0.2)
                            : (c.status == 'CRITICAL'
                                ? const Color(0xFFEF4444).withValues(alpha: 0.2)
                                : const Color(0xFF10B981).withValues(alpha: 0.15)))),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                  color: c.isPreIpo
                      ? const Color(0xFFF59E0B)
                      : (c.isSeized
                          ? const Color(0xFFEF4444)
                          : (c.isSuspended
                              ? const Color(0xFFEF4444)
                              : (c.status == 'CRITICAL'
                                  ? const Color(0xFFEF4444)
                                  : const Color(0xFF10B981)))),
                  width: 0.8,
                ),
              ),
              child: Text(
                c.isPreIpo
                    ? 'PRE-IPO'
                    : (c.isSeized
                        ? 'DISITA PNAF'
                        : (c.isSuspended
                            ? 'SUSPENSI'
                            : (c.status == 'CRITICAL' ? 'KRITIS' : 'SEHAT'))),
                style: TextStyle(
                  color: c.isPreIpo
                      ? const Color(0xFFF59E0B)
                      : (c.isSeized
                          ? const Color(0xFFF87171)
                          : (c.isSuspended
                              ? const Color(0xFFF87171)
                              : (c.status == 'CRITICAL'
                                  ? const Color(0xFFF87171)
                                  : const Color(0xFF34D399)))),
                  fontSize: 8.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            if (c.isUma && !c.isSuspended && !c.isSeized) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: (c.umaDirection == 'UP' || c.priceChangePct >= 0)
                      ? const Color(0xFF10B981).withValues(alpha: 0.2)
                      : const Color(0xFFEF4444).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: (c.umaDirection == 'UP' || c.priceChangePct >= 0)
                        ? const Color(0xFF10B981)
                        : const Color(0xFFEF4444),
                    width: 0.8,
                  ),
                ),
                child: Text(
                  (c.umaDirection == 'UP' || c.priceChangePct >= 0) ? 'UMA ▲ NAIK' : 'UMA ▼ TURUN',
                  style: TextStyle(
                    color: (c.umaDirection == 'UP' || c.priceChangePct >= 0)
                        ? const Color(0xFF34D399)
                        : const Color(0xFFF87171),
                    fontSize: 8.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF94A3B8)),
            onPressed: _fetchDetail,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Company Full Name
                    Text(
                      c.name,
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                    ),

                    // Seizure Alert Banner (Disita PNAF & BCF)
                    if (c.isSeized) ...[
                      Container(
                        margin: const EdgeInsets.only(top: 10, bottom: 6),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.gavel_rounded, color: Color(0xFFF87171), size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    isOwner
                                        ? 'PERUSAHAAN DISITA NEGARA & PNAF (MASA TENGGANG JATUH TEMPO)'
                                        : 'STATUS SITAAN NEGARA & PNAF (PERLINDUNGAN RETAIL)',
                                    style: const TextStyle(color: Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.w900),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              isOwner
                                  ? (c.seizeReason != null && c.seizeReason!.isNotEmpty
                                      ? 'Alasan: ${c.seizeReason}\n⚠️ Peringatan Jatuh Tempo: Anda diberikan batas masa tenggang 4 hari (96 jam) sejak tanggal jatuh tempo kredit perbankan. Jika tidak dilunasi sebelum masa tenggang habis, hak kepemilikan perseroan gugur dan perseroan resmi dilelang ke publik oleh Balai Lelang Negara PNAF!'
                                      : 'Eksekusi putusan wanprestasi PNAF & kredit macet perbankan BCF. Anda memiliki masa tenggang 4 hari (96 jam) untuk melunasi sanksi dan pinjaman sebelum perseroan siap dilelang ke publik.')
                                  : 'Perseroan sedang disita oleh Negara & Pengadilan Niaga PNAF karena gagal bayar kredit perbankan pendiri. Portofolio saham investor publik tetap aman di kustodian bursa dan TIDAK dikenakan denda apapun. Perdagangan saham dibekukan menunggu penebusan oleh founder atau pelaksanaan lelang terbuka.',
                              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, height: 1.4),
                            ),
                            if (isOwner) ...[
                              const SizedBox(height: 10),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFEF4444),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 9),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  icon: const Icon(Icons.currency_exchange_rounded, size: 16),
                                  label: const Text(
                                    'TEBUS PERSEROAN SAYA (LUNASI SEBELUM DILELANG)',
                                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold),
                                  ),
                                  onPressed: () => _showRedemptionSheet(context, c),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],

                    // UMA Alert Banner (Unusual Market Activity Radar)
                    if (c.isUma && !c.isSeized) ...[
                      Container(
                        margin: const EdgeInsets.only(top: 10, bottom: 6),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.35)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.warning_amber_rounded, color: Color(0xFFFBBF24), size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    (c.umaDirection == 'UP' || c.priceChangePct >= 0)
                                        ? '🚀 RADAR UMA: LONJAKAN HARGA TIDAK WAJAR (NAIK ▲)'
                                        : '⚠️ RADAR UMA: PENURUNAN HARGA TIDAK WAJAR (TURUN ▼)',
                                    style: TextStyle(
                                      color: (c.umaDirection == 'UP' || c.priceChangePct >= 0)
                                          ? const Color(0xFF34D399)
                                          : const Color(0xFFF87171),
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    c.umaReason != null && c.umaReason!.isNotEmpty
                                        ? c.umaReason!
                                        : 'Saham dalam radar pengawasan Bursa & IPMC atas fluktuasi harga atau volume transaksi di luar kebiasaan. Investor dihimbau mempertimbangkan keterbukaan informasi.',
                                    style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10, height: 1.4),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Auto Rejection Floor ARB Notice (-35%)
                    if (c.priceChangePct <= -34.0 && !c.isSeized) ...[
                      Container(
                        margin: const EdgeInsets.only(top: 6, bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.25)),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.shield_outlined, color: Color(0xFFF87171), size: 16),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Batas ARB Simetris (-35.00%) tercapai. Penurunan harga tertahan di batas maksimal circuit breaker bursa (-35%). Saham dapat memantul kembali (rebound) hingga +35% ARA melalui aksi akumulasi beli investor atau suntikan bailout kedaulatan.',
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, height: 1.35),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (c.isPreIpo) ...[
                      Container(
                        margin: const EdgeInsets.only(top: 4, bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.event_note_rounded, color: Color(0xFFF59E0B), size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'SAHAM TAHAP PRA-LISTING (E-IPO)\nJadwal resmi melantai ke bursa: ${c.listingDate ?? '1 Nov 2026'} (07:00 WIB). Grafik fluktuasi & orderbook sekunder aktif setelah listing.',
                                style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, height: 1.35),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),

                    // Price & Change Nominal + Percentage
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Flexible(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Text(
                              CurrencyFormatter.formatFull(c.isPreIpo ? c.basePrice : c.currentPrice),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: c.isPreIpo
                                ? const Color(0xFF334155)
                                : (isUp
                                    ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                    : const Color(0xFFEF4444).withValues(alpha: 0.15)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            c.isPreIpo
                                ? '0 (0.00%)'
                                : '${isUp ? '+' : ''}${CurrencyFormatter.formatNumberOnly(nominalDiff)} (${CurrencyFormatter.formatPercentage(c.priceChangePct)})',
                            style: TextStyle(
                              color: c.isPreIpo
                                  ? const Color(0xFF94A3B8)
                                  : (isUp ? const Color(0xFF34D399) : const Color(0xFFF87171)),
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '1 Lot = ${CurrencyFormatter.formatFull(c.lotPrice)} (100 Lembar)',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                    ),
                    const SizedBox(height: 16),

                    // Interactive Chart Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        children: [
                          // Timeframe selector bar + Candlestick/Line Toggle
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: ['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((tf) {
                                    final isSel = _selectedTimeframe == tf;
                                    return InkWell(
                                      onTap: () => _onTimeframeChanged(tf),
                                      child: Container(
                                        margin: const EdgeInsets.only(right: 6),
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isSel ? const Color(0xFF0284C7) : const Color(0xFF1E293B),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          tf,
                                          style: TextStyle(
                                            color: isSel ? Colors.white : const Color(0xFF94A3B8),
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),

                              // Stockbit Dual-Icon Toggle Pill
                              Container(
                                padding: const EdgeInsets.all(2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E293B),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    InkWell(
                                      onTap: () {
                                        if (_chartType != 'CANDLE') {
                                          setState(() => _chartType = 'CANDLE');
                                        }
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _chartType == 'CANDLE' ? const Color(0xFF0284C7) : Colors.transparent,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Icon(
                                          Icons.candlestick_chart_rounded,
                                          size: 15,
                                          color: _chartType == 'CANDLE' ? Colors.white : const Color(0xFF94A3B8),
                                        ),
                                      ),
                                    ),
                                    InkWell(
                                      onTap: () {
                                        if (_chartType != 'LINE') {
                                          setState(() => _chartType = 'LINE');
                                        }
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _chartType == 'LINE' ? const Color(0xFF0284C7) : Colors.transparent,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Icon(
                                          Icons.show_chart_rounded,
                                          size: 15,
                                          color: _chartType == 'LINE' ? Colors.white : const Color(0xFF94A3B8),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          // Price range indicator (High / Low / Scrub price)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              if (c.isPreIpo)
                                Row(
                                  children: [
                                    Text(
                                      'Harga Penawaran: IB ${CurrencyFormatter.formatNumberOnly(c.basePrice.round())}',
                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '• 1 Lot: IB ${CurrencyFormatter.formatNumberOnly(c.lotPrice.round())}',
                                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                    ),
                                  ],
                                )
                              else if (_scrubPrice != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFF38BDF8)),
                                  ),
                                  child: Text(
                                    'Kursor: IB ${CurrencyFormatter.formatNumberOnly(_scrubPrice!.round())}',
                                    style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                )
                              else
                                Row(
                                  children: [
                                    Text(
                                      'H: ${CurrencyFormatter.formatNumberOnly((candlePoints.map((c) => c.high).reduce(max)).round())}',
                                      style: const TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      'L: ${CurrencyFormatter.formatNumberOnly((candlePoints.map((c) => c.low).reduce(min)).round())}',
                                      style: const TextStyle(color: Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              Row(
                                children: [
                                  Icon(
                                    Icons.fiber_manual_record,
                                    color: c.isPreIpo
                                        ? const Color(0xFF64748B)
                                        : (isUp ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
                                    size: 7,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    c.isPreIpo
                                        ? 'PRA-LISTING'
                                        : (isUp ? 'BULLISH' : 'BEARISH'),
                                    style: TextStyle(
                                      color: c.isPreIpo
                                          ? const Color(0xFF94A3B8)
                                          : (isUp ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // Custom Chart with Gesture Detector (Touch/Scrub)
                          SizedBox(
                            height: 225,
                            width: double.infinity,
                            child: _isLoading
                                ? const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8)))
                                : LayoutBuilder(
                                    builder: (ctx, constraints) {
                                      return GestureDetector(
                                        onHorizontalDragUpdate: (details) {
                                          if (c.isPreIpo) return;
                                          final count = candlePoints.length;
                                          final plotWidth = constraints.maxWidth - 54.0;
                                          final stepX = plotWidth / count;
                                          final idx = (details.localPosition.dx / stepX).floor().clamp(0, count - 1);
                                          setState(() {
                                            _scrubIndex = idx;
                                            _scrubPrice = candlePoints[idx].close;
                                          });
                                        },
                                        onHorizontalDragEnd: (_) {
                                          setState(() {
                                            _scrubIndex = null;
                                            _scrubPrice = null;
                                          });
                                        },
                                        child: CustomPaint(
                                          size: Size(constraints.maxWidth, 225),
                                          painter: _chartType == 'CANDLE'
                                              ? LiveStockCandleChartPainter(
                                                  candles: candlePoints,
                                                  isUp: isUp,
                                                  scrubIndex: _scrubIndex,
                                                  isPreIpo: c.isPreIpo,
                                                  basePrice: c.basePrice,
                                                )
                                              : LiveStockChartPainter(
                                                  points: chartPoints,
                                                  isUp: isUp,
                                                  scrubIndex: _scrubIndex,
                                                  isPreIpo: c.isPreIpo,
                                                  basePrice: c.basePrice,
                                                ),
                                        ),
                                      );
                                    },
                                  ),
                          ),
                        ],
                      ),
                    ),

                    // Stockbit Technical Indicator Row (MA, EMA, BOLL, VOL, RSI, MACD, KDJ)
                    _buildTechnicalIndicatorsRow(),

                    // Stockbit Sub-Tabs (Orderbook, Trade Activity, Informasi Broker, Insider)
                    _buildStockbitSubTabs(),

                    // Stockbit Bursa IDX 3x3 Stats Card (Open, Prev, Lot, High, ARA, Val, Low, ARB, Avg)
                    _buildStockbitBursaStats(c, candlePoints),

                    // Suspended / UMA Banners
                    if (c.status == 'SUSPENDED') _buildSuspendedBanner(context, c),
                    if (c.status == 'CRITICAL') _buildCriticalUmaBanner(context, c),

                    // ==========================================
                    // ORDERBOOK HEADER (STOCKBIT STYLE)
                    // ==========================================
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Order Book',
                          style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                        ),
                        InkWell(
                          onTap: () => _showOrderQueueDetailSheet(context, c, orderbook),
                          child: const Text(
                            'Lihat Antrean Order',
                            style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Orderbook 6-Column Table (Freq | Lot | Bid | Ask | Lot | Freq)
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        children: [
                          // Header table
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: const BoxDecoration(
                              color: Color(0xFF1E293B),
                              borderRadius: BorderRadius.vertical(top: Radius.circular(11)),
                            ),
                            child: const Row(
                              children: [
                                SizedBox(width: 22, child: Text('Freq', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5, fontWeight: FontWeight.bold))),
                                Expanded(child: Text('Lot', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold))),
                                Text('Bid', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                SizedBox(width: 14),
                                Text('Ask', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                Expanded(child: Text('Lot', textAlign: TextAlign.right, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold))),
                                SizedBox(width: 22, child: Text('Freq', textAlign: TextAlign.right, style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5, fontWeight: FontWeight.bold))),
                              ],
                            ),
                          ),

                          // 5 Orderbook Rows with realistic Freq & ARA empty offer handling
                          ...List.generate(5, (i) {
                            const bidFreqs = [2, 5, 8, 14, 21];
                            const offerFreqs = [4, 7, 12, 19, 28];
                            final bid = i < orderbook.bids.length ? orderbook.bids[i] : null;
                            final offer = i < orderbook.offers.length ? orderbook.offers[i] : null;
                            return _buildOrderbookRow(
                              bid,
                              offer,
                              maxOrderbookLots,
                              bidFreqs[i],
                              offerFreqs[i],
                              isLast: i == 4,
                            );
                          }),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Buy vs Sell Pressure Bar
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Beli (Bid): ${orderbook.buyPressurePct}%',
                                style: const TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'Jual (Offer): ${orderbook.sellPressurePct}%',
                                style: const TextStyle(color: Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: SizedBox(
                              height: 8,
                              child: Row(
                                children: [
                                  Expanded(
                                    flex: orderbook.buyPressurePct,
                                    child: Container(color: const Color(0xFF10B981)),
                                  ),
                                  Expanded(
                                    flex: orderbook.sellPressurePct,
                                    child: Container(color: const Color(0xFFEF4444)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Total Antre: ${CurrencyFormatter.formatNumberOnly(orderbook.totalBidLots)} Lot',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                              ),
                              Text(
                                'Total Antre: ${CurrencyFormatter.formatNumberOnly(orderbook.totalOfferLots)} Lot',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // KARTU POSISI KEPEMILIKAN SAHAM ANDA (DIBAWAH ORDERBOOK)
                    _buildHoldingCard(
                      ownedLots,
                      ownedShares,
                      isHoldingProfit,
                      totalInvested,
                      avgBuyPrice,
                      profitLoss,
                      profitLossPct,
                      currentHoldingVal,
                    ),
                    const SizedBox(height: 20),

                    // ==========================================
                    // EMITEN FUNDAMENTAL & DIVIDEND SUMMARY
                    // ==========================================
                    const Text(
                      'Ringkasan Keuangan Emiten',
                      style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        children: [
                          _statRow('Skor Fundamental', '${c.fundamentalScore.toStringAsFixed(0)} / 100', c.fundamentalScore >= 50 ? const Color(0xFF34D399) : const Color(0xFFF87171)),
                          const Divider(color: Color(0xFF1E293B), height: 16),
                          _statRow('Tingkat Dividen', '${(c.dividendRate * 100).toStringAsFixed(1)}% (Rutin setiap 30 menit)', const Color(0xFFF59E0B)),
                          const Divider(color: Color(0xFF1E293B), height: 16),
                          _statRow('Harga Dasar (IPO)', CurrencyFormatter.formatFull(c.basePrice), Colors.white),
                          const Divider(color: Color(0xFF1E293B), height: 16),
                          _statRow('Total Saham Beredar', '${CurrencyFormatter.formatNumberOnly(c.totalShares)} Lembar', const Color(0xFFCBD5E1)),
                          const Divider(color: Color(0xFF1E293B), height: 16),
                          _statRow(
                            'Kapitalisasi Pasar',
                            CurrencyFormatter.formatFull(c.currentPrice * c.totalShares),
                            const Color(0xFF34D399),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // KARTU EDUKASI & MEKANISME PEMULIHAN KRISIS
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: c.status == 'CRITICAL'
                            ? const Color(0xFF7F1D1D).withValues(alpha: 0.25)
                            : const Color(0xFF064E3B).withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: c.status == 'CRITICAL' ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                          width: 1.2,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                c.status == 'CRITICAL' ? Icons.warning_amber_rounded : Icons.verified_user_rounded,
                                color: c.status == 'CRITICAL' ? const Color(0xFFF87171) : const Color(0xFF34D399),
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                c.status == 'CRITICAL' ? 'EMITEN DALAM MASA KRITIS' : 'EMITEN KEUANGAN SEHAT',
                                style: TextStyle(
                                  color: c.status == 'CRITICAL' ? const Color(0xFFF87171) : const Color(0xFF34D399),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            c.status == 'CRITICAL'
                                ? '• Skor Fundamental ${c.fundamentalScore.toStringAsFixed(0)}/100 (< 50). Saham mengalami tren penurunan harga (merah) akibat sentimen bearish pasar.\n• MEKANISME PULIH OTOMATIS: Jika investor beramai-ramai membeli saham ini hingga mencapai skor 50, emiten ini akan OTOMATIS PULIH menjadi SEHAT dan harga akan melesat naik!'
                                : '• Skor Fundamental ${c.fundamentalScore.toStringAsFixed(0)}/100 (Solid). Perusahaan beroperasi normal dan membagikan dividen rutin setiap siklus langsung ke rekening kas pribadi Anda.',
                            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // ==========================================
            // STICKY BOTTOM ACTION BAR (BUY & SELL)
            // ==========================================
            // Bottom Trading Action Bar or Suspended Action Bar
            if (c.isPreIpo)
              SafeArea(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F172A),
                    border: Border(top: BorderSide(color: Color(0xFF1E293B))),
                  ),
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            backgroundColor: const Color(0xFF1E293B),
                            content: Text(
                              'Saham ${c.symbol} masih dalam tahap penawaran perdana (Pre-IPO) hingga tanggal listing ${c.listingDate ?? '1 Nov 2026'}. Silakan pesan melalui menu E-IPO!',
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.event_note_rounded, color: Color(0xFF022C22), size: 18),
                      label: Text(
                        'TAHAP E-IPO (LISTING: ${c.listingDate ?? '1 NOV 2026'})',
                        style: const TextStyle(color: Color(0xFF022C22), fontWeight: FontWeight.w900, fontSize: 12),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
              )
            else if (c.isSeized)
              if (isOwner)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F172A),
                    border: Border(top: BorderSide(color: Color(0xFFEF4444))),
                  ),
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () => _showRedemptionSheet(context, c),
                      icon: const Icon(Icons.currency_exchange_rounded, color: Colors.white, size: 20),
                      label: const Text(
                        'TEBUS PERSEROAN SAYA (MASA TENGGANG JATUH TEMPO)',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                )
              else
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F172A),
                    border: Border(top: BorderSide(color: Color(0xFF1E293B))),
                  ),
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            backgroundColor: const Color(0xFF0F172A),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            title: const Row(
                              children: [
                                Icon(Icons.gavel_rounded, color: Color(0xFFEF4444)),
                                SizedBox(width: 8),
                                Text('Perdagangan Dibekukan', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            content: Text(
                              'Perseroan ${c.name} (${c.symbol}) sedang disita negara oleh Pengadilan Niaga PNAF & BCF akibat kredit pinjaman pendiri yang belum diselesaikan. Perdagangan saham dibekukan sementara. Seluruh portofolio investor publik tetap aman tersimpan di kustodian bursa.',
                              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12.5, height: 1.4),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('Mengerti', style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        );
                      },
                      icon: const Icon(Icons.lock_rounded, color: Color(0xFFEF4444), size: 18),
                      label: const Text(
                        'PERDAGANGAN DIBEKUKAN (SITAAN PNAF & BCF)',
                        style: TextStyle(color: Color(0xFFF87171), fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E293B),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                )
            else if (c.status == 'SUSPENDED')
              if (isOwner)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F172A),
                    border: Border(top: BorderSide(color: Color(0xFF1E293B))),
                  ),
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () => _confirmUnsuspend(context, c),
                      icon: const Icon(Icons.lock_open_rounded, color: Colors.white, size: 20),
                      label: const Text(
                        'BUKA SUSPENSI EMITEN SAYA (BAYAR DENDA)',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                )
              else
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F172A),
                    border: Border(top: BorderSide(color: Color(0xFF1E293B))),
                  ),
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            backgroundColor: const Color(0xFF0F172A),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            title: const Row(
                              children: [
                                Icon(Icons.lock_clock_rounded, color: Color(0xFFEF4444)),
                                SizedBox(width: 8),
                                Text('Perdagangan Dibekukan', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            content: Text(
                              'Saham ${c.symbol} sedang disuspensi oleh bursa efek. Sebagai investor publik/ritel, lot saham portofolio Anda tetap aman tersimpan di kustodian bursa, namun order beli dan jual ditangguhkan sementara hingga suspensi dicabut oleh pemilik atau otoritas bursa.',
                              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12.5, height: 1.4),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('Mengerti', style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        );
                      },
                      icon: const Icon(Icons.lock_clock_rounded, color: Color(0xFF94A3B8), size: 18),
                      label: const Text(
                        'PERDAGANGAN DIBEKUKAN (SUSPENSI BURSA)',
                        style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E293B),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                )
            else
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                decoration: const BoxDecoration(
                  color: Color(0xFF0F172A),
                  border: Border(top: BorderSide(color: Color(0xFF1E293B))),
                ),
                child: Row(
                  children: [
                    // Buy Button
                    Expanded(
                      child: SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => TradingModal(company: c, initialType: 'BUY'),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.arrow_upward_rounded, color: Color(0xFF022C22), size: 18),
                            SizedBox(width: 6),
                            Flexible(
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  'BELI SAHAM',
                                  style: TextStyle(color: Color(0xFF022C22), fontWeight: FontWeight.w900, fontSize: 13),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Sell Button
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () {
                          if (ownedLots <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Anda belum memiliki lot saham ${c.symbol} untuk dijual.'),
                                backgroundColor: const Color(0xFFEF4444),
                              ),
                            );
                            return;
                          }
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => TradingModal(company: c, initialType: 'SELL'),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ownedLots > 0 ? const Color(0xFFEF4444) : const Color(0xFF334155),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.arrow_downward_rounded, color: Colors.white, size: 18),
                            const SizedBox(width: 6),
                            Flexible(
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  ownedLots > 0 ? 'JUAL (${CurrencyFormatter.formatNumberOnly(ownedLots)} LOT)' : 'JUAL SAHAM',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderbookRow(OrderbookLevel? bid, OrderbookLevel? offer, int maxLots, int bidFreq, int offerFreq, {bool isLast = false}) {
    final double bidLots = (bid?.lots ?? 0).toDouble();
    final double offerLots = (offer?.lots ?? 0).toDouble();
    final double safeMaxLots = max(1.0, maxLots.toDouble());
    final double bidWidthRatio = (bidLots / safeMaxLots).clamp(0.04, 1.0);
    final double offerWidthRatio = (offerLots / safeMaxLots).clamp(0.04, 1.0);
    final bool isOfferEmpty = (offer == null || offer.lots == 0);

    return Container(
      decoration: BoxDecoration(
        border: isLast ? null : const Border(bottom: BorderSide(color: Color(0xFF1E293B), width: 0.5)),
      ),
      child: Row(
        children: [
          // Left side: BID (Freq, Lot, Bid)
          Expanded(
            child: bid != null
                ? Stack(
                    children: [
                      Positioned.fill(
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: FractionallySizedBox(
                            widthFactor: bidWidthRatio,
                            child: Container(
                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                            ),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 22,
                              child: Text(
                                '$bidFreq',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                CurrencyFormatter.formatNumberOnly(bid.lots),
                                style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11),
                              ),
                            ),
                            Text(
                              CurrencyFormatter.formatNumberOnly(bid.price.round()),
                              style: const TextStyle(color: Color(0xFF34D399), fontSize: 11.5, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : const SizedBox.shrink(),
          ),
          Container(width: 1, height: 28, color: const Color(0xFF1E293B)),

          // Right side: ASK (Ask, Lot, Freq)
          Expanded(
            child: isOfferEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('-', style: TextStyle(color: Color(0xFF64748B), fontSize: 11.5, fontWeight: FontWeight.bold)),
                        Text('Offer Kosong (0 Lot)', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5, fontStyle: FontStyle.italic)),
                        Text('-', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                      ],
                    ),
                  )
                : Stack(
                    children: [
                      Positioned.fill(
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: FractionallySizedBox(
                            widthFactor: offerWidthRatio,
                            child: Container(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                            ),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        child: Row(
                          children: [
                            Text(
                              CurrencyFormatter.formatNumberOnly(offer.price.round()),
                              style: const TextStyle(color: Color(0xFFF87171), fontSize: 11.5, fontWeight: FontWeight.w900),
                            ),
                            Expanded(
                              child: Text(
                                CurrencyFormatter.formatNumberOnly(offer.lots),
                                textAlign: TextAlign.right,
                                style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11),
                              ),
                            ),
                            SizedBox(
                              width: 22,
                              child: Text(
                                '$offerFreq',
                                textAlign: TextAlign.right,
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTechnicalIndicatorsRow() {
    final indicators = ['MA', 'EMA', 'BOLL', 'VOL', 'RSI', 'MACD', 'KDJ'];
    return Padding(
      padding: const EdgeInsets.only(top: 8.0, bottom: 4.0),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: indicators.map((ind) {
            final isSel = _selectedIndicator == ind;
            return InkWell(
              onTap: () => setState(() => _selectedIndicator = ind),
              child: Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: isSel ? const Color(0xFF1E293B) : Colors.transparent,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  ind,
                  style: TextStyle(
                    color: isSel ? const Color(0xFF38BDF8) : const Color(0xFF64748B),
                    fontSize: 10,
                    fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildStockbitSubTabs() {
    final tabs = ['Orderbook', 'Trade Activity', 'Informasi Broker', 'Insider'];
    return Container(
      margin: const EdgeInsets.only(top: 10, bottom: 4),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFF1E293B), width: 1)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: tabs.map((tab) {
            final isSel = _selectedSubTab == tab;
            return InkWell(
              onTap: () => setState(() => _selectedSubTab = tab),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  border: isSel
                      ? const Border(bottom: BorderSide(color: Color(0xFF38BDF8), width: 2.5))
                      : null,
                ),
                child: Text(
                  tab,
                  style: TextStyle(
                    color: isSel ? const Color(0xFF38BDF8) : const Color(0xFF94A3B8),
                    fontSize: 12,
                    fontWeight: isSel ? FontWeight.w900 : FontWeight.w600,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildStockbitBursaStats(CompanyModel c, List<PricePoint> candlePoints) {
    final double openPrice = candlePoints.isNotEmpty ? candlePoints.first.open : c.basePrice;
    final double prevPrice = c.basePrice;
    final double highPrice = candlePoints.isNotEmpty ? candlePoints.map((cp) => cp.high).reduce(max) : c.currentPrice * 1.05;
    final double lowPrice = candlePoints.isNotEmpty ? candlePoints.map((cp) => cp.low).reduce(min) : c.currentPrice * 0.95;

    // Ketentuan Sirkuit Pemutus Simetris Bursa Federasi IPMC:
    // • ARA: +35.00% (Listing IPO: +50.0%)
    // • ARB: -35.00%
    final double araPct = c.isIpo ? 50.0 : 35.0;
    final double araPrice = (c.basePrice * (1 + (araPct / 100.0))).roundToDouble();
    final double arbPrice = (c.basePrice * 0.65).roundToDouble(); // ARB Simetris -35%
    final double avgPrice = ((highPrice + lowPrice + c.currentPrice) / 3).roundToDouble();
    final double totalLotVolume = (c.totalShares * 0.0386 / 100).roundToDouble();
    final double totalTradeValue = totalLotVolume * avgPrice * 100;

    final openColor = openPrice > prevPrice
        ? const Color(0xFF34D399)
        : (openPrice < prevPrice ? const Color(0xFFF87171) : Colors.white);

    final lotText = totalLotVolume >= 1000
        ? '${(totalLotVolume / 1000).toStringAsFixed(2).replaceAll('.', ',')}K'
        : CurrencyFormatter.formatNumberOnly(totalLotVolume.round());

    final valText = totalTradeValue >= 1000000000
        ? '${(totalTradeValue / 1000000000).toStringAsFixed(2).replaceAll('.', ',')}B'
        : '${(totalTradeValue / 1000000).toStringAsFixed(2).replaceAll('.', ',')}M';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              _bursaStatItem('Open', CurrencyFormatter.formatNumberOnly(openPrice.round()), openColor),
              _bursaStatItem('Prev', CurrencyFormatter.formatNumberOnly(prevPrice.round()), Colors.white),
              _bursaStatItem('Lot', lotText, Colors.white),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _bursaStatItem('High', CurrencyFormatter.formatNumberOnly(highPrice.round()), const Color(0xFF34D399)),
              _bursaStatItem('ARA', CurrencyFormatter.formatNumberOnly(araPrice.round()), const Color(0xFF34D399)),
              _bursaStatItem('Val', valText, Colors.white),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _bursaStatItem('Low', CurrencyFormatter.formatNumberOnly(lowPrice.round()), const Color(0xFFF87171)),
              _bursaStatItem('ARB', CurrencyFormatter.formatNumberOnly(arbPrice.round()), const Color(0xFFF87171)),
              _bursaStatItem('Avg', CurrencyFormatter.formatNumberOnly(avgPrice.round()), Colors.white),
            ],
          ),
        ],
      ),
    );
  }

  Widget _bursaStatItem(String label, String value, Color valColor) {
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: Text(
              value,
              style: TextStyle(color: valColor, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statRow(String label, String value, Color valColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
        Text(value, style: TextStyle(color: valColor, fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildHoldingCard(
    int ownedLots,
    int ownedShares,
    bool isHoldingProfit,
    double totalInvested,
    double avgBuyPrice,
    double profitLoss,
    double profitLossPct,
    double currentHoldingVal,
  ) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 16, bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: ownedLots > 0
              ? [
                  const Color(0xFF0F172A),
                  isHoldingProfit
                      ? const Color(0xFF064E3B).withValues(alpha: 0.35)
                      : const Color(0xFF7F1D1D).withValues(alpha: 0.35),
                ]
              : [const Color(0xFF0F172A), const Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: ownedLots > 0
              ? (isHoldingProfit
                  ? const Color(0xFF10B981).withValues(alpha: 0.5)
                  : const Color(0xFFEF4444).withValues(alpha: 0.5))
              : const Color(0xFF334155),
          width: 1.2,
        ),
      ),
      child: ownedLots > 0
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Icon(
                            Icons.account_balance_wallet_rounded,
                            color: isHoldingProfit ? const Color(0xFF34D399) : const Color(0xFFF87171),
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          const Flexible(
                            child: Text(
                              'KEPEMILIKAN SAHAM ANDA',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        '${CurrencyFormatter.formatNumberOnly(ownedLots)} LOT',
                        style: const TextStyle(
                          color: Color(0xFF38BDF8),
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(color: Color(0xFF334155), height: 1),
                const SizedBox(height: 12),

                // Row 1: Modal Beli vs Keuntungan
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Modal Beli Awal',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            CurrencyFormatter.formatFull(totalInvested),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            'Rerata: ${CurrencyFormatter.formatFull(avgBuyPrice)} (${CurrencyFormatter.formatNumberOnly(ownedShares)} lbr)',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            'Keuntungan (Floating P/L)',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${isHoldingProfit ? '+' : ''}${CurrencyFormatter.formatFull(profitLoss)}',
                            style: TextStyle(
                              color: isHoldingProfit ? const Color(0xFF34D399) : const Color(0xFFF87171),
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            '(${isHoldingProfit ? '+' : ''}${profitLossPct.toStringAsFixed(2)}%)',
                            style: TextStyle(
                              color: isHoldingProfit ? const Color(0xFF34D399) : const Color(0xFFF87171),
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(color: Color(0xFF334155), height: 1),
                const SizedBox(height: 10),

                // Row 2: Total Nilai Saham Saat Ini
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Total Nilai Portofolio Saat Ini',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Modal Beli + Keuntungan Realistis',
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 9),
                        ),
                      ],
                    ),
                    Text(
                      CurrencyFormatter.formatFull(currentHoldingVal),
                      style: TextStyle(
                        color: isHoldingProfit ? const Color(0xFF34D399) : const Color(0xFFF87171),
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ],
            )
          : const Row(
              children: [
                Icon(Icons.info_outline_rounded, color: Color(0xFF64748B), size: 18),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Anda belum memiliki saham emiten ini. Beli mulai 1 Lot untuk mengumpulkan profit dan dividen.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildSuspendedBanner(BuildContext context, CompanyModel c) {
    final provider = context.watch<GameProvider>();
    final user = provider.user;
    final isOwner = user != null && c.ownerId != null && c.ownerId == user.id;

    if (!isOwner) {
      return Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444).withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.5), width: 1.2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.lock_clock_rounded, color: Color(0xFFEF4444), size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'PERDAGANGAN SAHAM DIBEKUKAN SEMENTARA (SUSPENSI)',
                    style: TextStyle(
                      color: Color(0xFFEF4444),
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'BEKUK',
                    style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 9.5, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Demi perlindungan modal investor, bursa membekukan sementara perdagangan efek ${c.symbol}. Seluruh order beli dan jual di pasar reguler ditangguhkan sementara hingga pemilik emiten atau otoritas bursa menyelesaikan evaluasi pemulihan. Seluruh lot saham di portofolio Anda tetap aman tersimpan di kustodian bursa.',
              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.35),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: Color(0xFF38BDF8), size: 14),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Status: Menunggu penyelesaian denda administrasi oleh pemilik emiten atau pencabutan suspensi oleh otoritas bursa.',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEF4444).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.7), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.gavel_rounded, color: Color(0xFFEF4444), size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'PERUSAHAAN ANDA DISUSPENSI BURSA',
                  style: TextStyle(
                    color: Color(0xFFEF4444),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.timer_outlined, color: Color(0xFFFCA5A5), size: 11),
                    SizedBox(width: 3),
                    Text(
                      '3 HARI',
                      style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Demi perlindungan pasar, bursa membekukan sementara perdagangan saham ${c.symbol}. Sebagai PEMILIK / FOUNDER, Anda diberi batas waktu 3 Hari (72 Jam) untuk melunasi denda administrasi pemulihan atau melakukan penjualan saham darurat sebelum perusahaan disita & dikelola oleh negara/bursa.',
            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.35),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _confirmUnsuspend(context, c),
                  icon: const Icon(Icons.lock_open_rounded, color: Colors.white, size: 14),
                  label: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      'Bayar Denda (IB 50 Juta)',
                      style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w900),
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _showEmergencySaleDialog(context, c),
                  icon: const Icon(Icons.emergency_share_rounded, color: Color(0xFF451A03), size: 14),
                  label: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      'Jual Darurat Diskon 50%',
                      style: TextStyle(color: Color(0xFF451A03), fontSize: 10.5, fontWeight: FontWeight.w900),
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCriticalUmaBanner(BuildContext context, CompanyModel c) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.6)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B), size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'STATUS: KRITIS / UMA (Unusual Market Activity)',
                  style: TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Saham ini mengalami tekanan penurunan ekstrim. Sebagai otoritas bursa IPMC, Anda dapat melakukan suspensi untuk menghentikan kerugian lebih lanjut.',
                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.3),
                ),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () => _confirmSuspend(context, c),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFEF4444)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lock_outline_rounded, color: Color(0xFFEF4444), size: 14),
                        SizedBox(width: 6),
                        Text(
                          'Bekukan Saham Ini (Suspensi IPMC)',
                          style: TextStyle(color: Color(0xFFEF4444), fontSize: 10.5, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showOrderQueueDetailSheet(BuildContext context, CompanyModel c, OrderbookModel orderbook) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.82,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (_, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(top: BorderSide(color: Color(0xFF334155))),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF334155),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Sheet Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  c.symbol,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'MARKET DEPTH',
                                    style: TextStyle(
                                      color: Color(0xFF38BDF8),
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Kedalaman Antrean Order Bursa (Price-Time Priority)',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Divider(color: Color(0xFF1E293B), height: 1),

                  // Scrollable Queue Content
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.all(18),
                      children: [
                        // Educational Note
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF334155)),
                          ),
                          child: const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.info_outline_rounded, color: Color(0xFF38BDF8), size: 18),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Fitur "Lihat Antrean Order" menampilkan kedalaman pasar (Market Depth) secara real-time. Anda dapat memantau urutan antrean pembeli (Bid) dan penjual (Offer), volume lot di setiap fraksi harga, serta kode broker partisipan bursa.',
                                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.35),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Depth Ratio Summary Card
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Total Antre Beli (Bid)', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${CurrencyFormatter.formatNumberOnly(orderbook.totalBidLots)} Lot',
                                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                                    ),
                                    Text('${orderbook.buyPressurePct}% Tekanan Beli', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Total Antre Jual (Offer)', style: TextStyle(color: Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${CurrencyFormatter.formatNumberOnly(orderbook.totalOfferLots)} Lot',
                                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                                    ),
                                    Text('${orderbook.sellPressurePct}% Tekanan Jual', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        // Section Title: Antrean Beli (Bid)
                        const Row(
                          children: [
                            Icon(Icons.arrow_circle_up_rounded, color: Color(0xFF10B981), size: 16),
                            SizedBox(width: 6),
                            Text(
                              'Antrean Pembeli Terdepan (Bids)',
                              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Bid Table
                        ...List.generate(orderbook.bids.length, (idx) {
                          final b = orderbook.bids[idx];
                          const brokerCodes = ['YP', 'CC', 'PD', 'NI', 'MG'];
                          final broker = brokerCodes[idx % brokerCodes.length];
                          return _buildQueueCard(
                            rank: idx + 1,
                            price: b.price,
                            lots: b.lots,
                            isBid: true,
                            broker: broker,
                            maxLots: max(1, orderbook.totalBidLots),
                          );
                        }),

                        const SizedBox(height: 20),

                        // Section Title: Antrean Jual (Offer)
                        const Row(
                          children: [
                            Icon(Icons.arrow_circle_down_rounded, color: Color(0xFFEF4444), size: 16),
                            SizedBox(width: 6),
                            Text(
                              'Antrean Penjual Terdepan (Asks/Offers)',
                              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Offer Table
                        ...List.generate(orderbook.offers.length, (idx) {
                          final o = orderbook.offers[idx];
                          const brokerCodes = ['XL', 'AK', 'CS', 'KZ', 'GR'];
                          final broker = brokerCodes[idx % brokerCodes.length];
                          return _buildQueueCard(
                            rank: idx + 1,
                            price: o.price,
                            lots: o.lots,
                            isBid: false,
                            broker: broker,
                            maxLots: max(1, orderbook.totalOfferLots),
                          );
                        }),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildQueueCard({
    required int rank,
    required double price,
    required int lots,
    required bool isBid,
    required String broker,
    required int maxLots,
  }) {
    final color = isBid ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final ratio = (lots / maxLots).clamp(0.08, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF334155).withValues(alpha: 0.6)),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: Align(
              alignment: isBid ? Alignment.centerLeft : Alignment.centerRight,
              child: FractionallySizedBox(
                widthFactor: ratio,
                child: Container(
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ),
          Row(
            children: [
              Container(
                width: 22,
                height: 22,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF475569)),
                ),
                child: Text(
                  '#$rank',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: color.withValues(alpha: 0.5)),
                ),
                child: Text(
                  broker,
                  style: TextStyle(color: color, fontSize: 9.5, fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                CurrencyFormatter.formatFull(price),
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900),
              ),
              const Spacer(),
              Text(
                '${CurrencyFormatter.formatNumberOnly(lots)} Lot',
                style: const TextStyle(color: Color(0xFFF1F5F9), fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 6),
              Text(
                '(${CurrencyFormatter.formatNumberOnly(lots * 100)} lbr)',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _confirmUnsuspend(BuildContext context, CompanyModel c) async {
    final provider = context.read<GameProvider>();
    final user = provider.user;
    final isOwner = user != null && c.ownerId != null && c.ownerId == user.id;

    if (!isOwner) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Akses Ditolak: Anda bukan pemilik perseroan ini. Denda suspensi wajib diselesaikan oleh pemilik/founder.'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
      return;
    }

    final userBalance = user.balanceIb;
    const penaltyAmount = 50000000.0;
    final messenger = ScaffoldMessenger.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.gavel_rounded, color: Color(0xFF10B981)),
            SizedBox(width: 8),
            Text('Pemulihan Suspensi Bursa', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Untuk mengaktifkan kembali saham ${c.symbol} dan melanjutkan perdagangan normal, selesaikan denda administrasi pemulihan bursa IPMC:',
              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12.5),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Denda Pemulihan IPMC', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      Text('IB 50.000.000', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 13, fontWeight: FontWeight.w900)),
                    ],
                  ),
                  const Divider(color: Color(0xFF334155), height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Saldo Tabungan Anda', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      Text(
                        CurrencyFormatter.formatFull(userBalance),
                        style: TextStyle(
                          color: userBalance >= penaltyAmount ? const Color(0xFF34D399) : const Color(0xFFEF4444),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            onPressed: userBalance >= penaltyAmount ? () => Navigator.pop(ctx, true) : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Bayar & Buka Suspensi', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final res = await provider.unsuspendCompany(c.id);
      if (!mounted) return;
      if (res['success'] == true) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Suspensi berhasil dicabut! Perdagangan kembali aktif.'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        _fetchDetail();
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? 'Gagal mencabut suspensi'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  // --- DIALOG PENJUALAN DARURAT SAHAM DISKON 50% ---
  Future<void> _showEmergencySaleDialog(BuildContext context, CompanyModel c) async {
    final provider = context.read<GameProvider>();
    final user = provider.user;
    final isOwner = user != null && c.ownerId != null && c.ownerId == user.id;

    if (!isOwner) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Akses Ditolak: Anda bukan pemilik perseroan ini. Penjualan darurat saham hanya dapat dilakukan oleh pendiri/pemilik emiten.'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
      return;
    }

    const double pctToSell = 20.0;
    const int sharesSold = 2000000; // 20% dari 10 Juta lembar
    final double normalPrice = c.currentPrice;
    final double discountPrice = (normalPrice * 0.50).roundToDouble();
    final double grossProceeds = sharesSold * discountPrice;
    const double penaltyFine = 50000000.0;
    final double netProceeds = max(0.0, grossProceeds - penaltyFine);
    final messenger = ScaffoldMessenger.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
        ),
        title: const Row(
          children: [
            Icon(Icons.emergency_share_rounded, color: Color(0xFFF59E0B), size: 22),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Restrukturisasi Penjualan Darurat',
                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                ),
                child: const Text(
                  'Sesuai Pasal 5 Regulasi IPMC: Pemilik dapat menjual paket darurat saham pendiri dengan DISKON 50% kepada Konsorsium Penyelamat IPMC. Dana penjualan otomatis memotong denda suspensi dan sisa uang tunai masuk ke Kas Pribadi.',
                  style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10.5, height: 1.35),
                ),
              ),
              const SizedBox(height: 12),

              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Paket Saham Dijual', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                        Text('${pctToSell.toStringAsFixed(0)}% (20.000 Lot)', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Harga Normal', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                        Text('IB ${CurrencyFormatter.formatNumberOnly(normalPrice.round())}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, decoration: TextDecoration.lineThrough)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Harga Darurat Diskon 50%', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                        Text('IB ${CurrencyFormatter.formatNumberOnly(discountPrice.round())}', style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(color: Color(0xFF334155), height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Perolehan Penjualan', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
                        Text(CurrencyFormatter.formatFull(grossProceeds), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('🏛️ Potongan Denda Bursa IPMC', style: TextStyle(color: Color(0xFFF87171), fontSize: 10.5)),
                        Text('-IB 50.000.000', style: TextStyle(color: Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(color: Color(0xFF334155), height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('💰 Masuk Bersih ke Kas Pribadi', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                        Text('+${CurrencyFormatter.formatFull(netProceeds)}', style: const TextStyle(color: Color(0xFF34D399), fontSize: 13, fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF59E0B),
              foregroundColor: const Color(0xFF451A03),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('EKSEKUSI & BUKA SUSPENSI', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11.5)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final res = await provider.emergencySaleCompany(c.id, pctToSell: pctToSell);
      if (!mounted) return;
      if (res['success'] == true) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Restrukturisasi darurat sukses! Suspensi dicabut.'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        _fetchDetail();
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? 'Gagal restrukturisasi darurat'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  Future<void> _confirmSuspend(BuildContext context, CompanyModel c) async {
    final provider = context.read<GameProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444)),
            SizedBox(width: 8),
            Text('Suspensi Saham (Bursa IPMC)', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: Text(
          'Apakah Anda sebagai otoritas bursa IPMC ingin membekukan (suspensi) saham ${c.symbol} demi menghentikan penurunan kerugian lebih lanjut?',
          style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Bekukan Saham (Suspensi)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final res = await provider.suspendCompany(c.id);
      if (!mounted) return;
      if (res['success'] == true) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Saham resmi disuspensi oleh bursa IPMC.'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
        _fetchDetail();
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? 'Gagal melakukan suspensi'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  Future<void> _showRedemptionSheet(BuildContext context, CompanyModel c) async {
    final provider = context.read<GameProvider>();
    final user = provider.user;
    if (user == null) return;

    final isOwner = c.ownerId != null && c.ownerId == user.id;
    if (!isOwner) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Akses Ditolak: Anda bukan pemilik perseroan ini. Penebusan sanksi sitaan hanya dapat dilakukan oleh pendiri/pemilik resmi selama masa tenggang 4 hari.'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>?>(
          future: ApiService.getRedemptionInfo(c.id, userId: user.id),
          builder: (ctx, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return Container(
                padding: const EdgeInsets.all(28),
                decoration: const BoxDecoration(
                  color: Color(0xFF0F172A),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Color(0xFFEF4444)),
                    SizedBox(height: 16),
                    Text('Menghitung kewajiban sanksi PNAF & pelunasan kredit bank BCF...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  ],
                ),
              );
            }

            final data = snapshot.data;
            if (data == null) {
              return Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: Color(0xFF0F172A),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 36),
                    const SizedBox(height: 12),
                    const Text('Gagal Memuat Data Penebusan', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Tutup'),
                    ),
                  ],
                ),
              );
            }

            final bool isAuctionReady = data['isAuctionReady'] == true;
            final int hoursLeft = (data['hoursLeft'] as num?)?.toInt() ?? 0;
            final double pnafFine = (data['pnafSanctionFine'] as num?)?.toDouble() ?? 100000000.0;
            final double bankPrincipal = (data['bankLoanPrincipal'] as num?)?.toDouble() ?? 0.0;
            final double bankInterest = (data['bankLoanInterest'] as num?)?.toDouble() ?? 0.0;
            final double totalBankDebt = (data['totalBankDebt'] as num?)?.toDouble() ?? (bankPrincipal + bankInterest);
            final double totalCost = (data['totalRedemptionCost'] as num?)?.toDouble() ?? (pnafFine + totalBankDebt);
            final bool canAfford = user.balanceIb >= totalCost;
            final bool isExpired = isAuctionReady || hoursLeft <= 0;

            return StatefulBuilder(
              builder: (ctx, setModalState) {
                bool isSubmitting = false;

                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0B1120),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                    border: Border(top: BorderSide(color: Color(0xFFEF4444), width: 1.5)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.lock_open_rounded, color: Color(0xFFF87171), size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'TEBUS PERSEROAN SITAAN',
                                  style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                                ),
                                Text(
                                  '${c.name} (${c.symbol})',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Countdown / Masa Tenggang Banner
                      if (isExpired)
                        Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF7F1D1D).withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFEF4444)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.gavel_rounded, color: Color(0xFFEF4444), size: 22),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'MASA TENGGANG JATUH TEMPO TELAH BERAKHIR\nMasa tenggang 4 hari (96 jam) pelunasan telah habis. Hak penebusan pemilik dinyatakan gugur dan perseroan resmi diserahkan ke Balai Lelang Negara PNAF untuk dilelang terbuka.',
                                  style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 11, height: 1.35, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.timer_outlined, color: Color(0xFFF59E0B), size: 22),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Sisa Masa Tenggang Penebusan: $hoursLeft Jam Lagi\nSesuai Statuta Niaga Federasi, pemilik diberi masa tenggang 4 hari (96 jam) sejak jatuh tempo kredit. Jika tidak ditebus, perseroan otomatis masuk daftar lelang umum PNAF.',
                                  style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 11, height: 1.35),
                                ),
                              ),
                            ],
                          ),
                        ),

                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('⚖️ Denda Sanksi PNAF', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                                Text(CurrencyFormatter.formatFull(pnafFine), style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('🏦 Pokok Utang Bank Sentral (BCF)', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                                Text(CurrencyFormatter.formatFull(bankPrincipal), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('📈 Bunga Pinjaman Bank BCF', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                                Text(CurrencyFormatter.formatFull(bankInterest), style: const TextStyle(color: Color(0xFFF87171), fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const Divider(color: Color(0xFF334155), height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('💰 TOTAL BIAYA PENEBUSAN', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900)),
                                Text(CurrencyFormatter.formatFull(totalCost), style: const TextStyle(color: Color(0xFF34D399), fontSize: 14, fontWeight: FontWeight.w900)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Saldo Kas Pribadi Anda:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                          Text(
                            CurrencyFormatter.formatFull(user.balanceIb),
                            style: TextStyle(
                              color: canAfford ? const Color(0xFF34D399) : const Color(0xFFF87171),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: (canAfford && !isExpired) ? const Color(0xFF10B981) : const Color(0xFF334155),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: (!canAfford || isSubmitting || isExpired)
                              ? null
                              : () async {
                                  setModalState(() => isSubmitting = true);
                                  final res = await ApiService.redeemCompany(companyId: c.id, userId: user.id);
                                  if (!context.mounted) return;
                                  Navigator.pop(ctx);
                                  final messenger = ScaffoldMessenger.of(context);
                                  if (res['success'] == true) {
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text(res['message'] ?? 'Perseroan berhasil ditebus!'),
                                        backgroundColor: const Color(0xFF10B981),
                                      ),
                                    );
                                    _fetchDetail();
                                    provider.fetchConglomerate();
                                    provider.refreshPortfolio();
                                    provider.loadInitialData();
                                  } else {
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text(res['error'] ?? 'Gagal menebus perseroan'),
                                        backgroundColor: const Color(0xFFEF4444),
                                      ),
                                    );
                                  }
                                },
                          child: Text(
                            isExpired
                                ? 'HAK PENEBUSAN GUGUR (SIAP DILELANG)'
                                : (canAfford ? 'LUNASI & AMBIL ALIH KEMBALI' : 'SALDO KAS PRIBADI TIDAK CUKUP'),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

class LiveStockCandleChartPainter extends CustomPainter {
  final List<PricePoint> candles;
  final bool isUp;
  final int? scrubIndex;
  final bool isPreIpo;
  final double basePrice;

  LiveStockCandleChartPainter({
    required this.candles,
    required this.isUp,
    this.scrubIndex,
    this.isPreIpo = false,
    this.basePrice = 2500.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (candles.isEmpty) return;

    const double rightAxisWidth = 54.0;
    const double bottomAxisHeight = 22.0;
    final double plotWidth = size.width - rightAxisWidth;
    final double plotHeight = size.height - bottomAxisHeight;

    if (isPreIpo) {
      _paintPreIpo(canvas, plotWidth, plotHeight, rightAxisWidth);
      return;
    }

    double minPrice = candles.map((c) => c.low).reduce((a, b) => a < b ? a : b);
    double maxPrice = candles.map((c) => c.high).reduce((a, b) => a > b ? a : b);
    if (maxPrice == minPrice) {
      maxPrice += 10.0;
      minPrice -= 10.0;
    }

    // Add 6% vertical breathing room
    final double priceSpan = maxPrice - minPrice;
    final double paddedMin = max(1.0, minPrice - priceSpan * 0.06);
    final double paddedMax = maxPrice + priceSpan * 0.06;
    final double paddedRange = max(1.0, paddedMax - paddedMin);

    final int count = candles.length;
    final double stepX = plotWidth / count;
    final double candleWidth = (stepX * 0.65).clamp(2.5, 12.0);

    // 1. Horizontal dashed grid lines & right-side price axis labels
    const int gridLevels = 4;
    final gridLinePaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..strokeWidth = 0.8;

    for (int i = 0; i <= gridLevels; i++) {
      final double y = plotHeight * (i / gridLevels);
      final double priceAtY = paddedMax - ((y / plotHeight) * paddedRange);

      _drawDashedLine(canvas, Offset(0, y), Offset(plotWidth, y), gridLinePaint, 3, 3);

      final textSpan = TextSpan(
        text: CurrencyFormatter.formatNumberOnly(priceAtY.round()),
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 9.5,
          fontWeight: FontWeight.w500,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(plotWidth + 6, y - (textPainter.height / 2)));
    }

    // 2. Bottom time axis timestamps (09:30, 11:00, 13:30, 15:00)
    final timeStep = max(1, (count / 4).floor());
    for (int i = 0; i < count; i += timeStep) {
      final centerX = (i * stepX) + (stepX / 2);
      final dt = candles[i].timestamp;
      final timeStr = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      final timeSpan = TextSpan(
        text: timeStr,
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 9.0,
          fontWeight: FontWeight.w500,
        ),
      );
      final timePainter = TextPainter(
        text: timeSpan,
        textDirection: TextDirection.ltr,
      );
      timePainter.layout();
      timePainter.paint(
        canvas,
        Offset(centerX - (timePainter.width / 2), plotHeight + 5),
      );
    }

    // 3. Volume indicator bars at the bottom 20% of plot area
    final double maxVol = candles.map((c) => c.volume.toDouble()).reduce(max);
    final double volAreaHeight = plotHeight * 0.20;
    for (int i = 0; i < count; i++) {
      final candle = candles[i];
      final isBull = candle.close >= candle.open;
      final volRatio = maxVol > 0 ? (candle.volume / maxVol) : 0.25;
      final volH = max(2.0, volRatio * volAreaHeight);
      final centerX = (i * stepX) + (stepX / 2);
      final volRect = Rect.fromLTWH(centerX - candleWidth / 2, plotHeight - volH, candleWidth, volH);
      final volPaint = Paint()
        ..color = (isBull ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withValues(alpha: 0.25)
        ..style = PaintingStyle.fill;
      canvas.drawRRect(RRect.fromRectAndRadius(volRect, const Radius.circular(1)), volPaint);
    }

    // 4. Candlesticks (Wick & Body)
    for (int i = 0; i < count; i++) {
      final candle = candles[i];
      final isBull = candle.close >= candle.open;
      final color = isBull ? const Color(0xFF10B981) : const Color(0xFFEF4444);
      final centerX = (i * stepX) + (stepX / 2);

      final openY = plotHeight - (((candle.open - paddedMin) / paddedRange) * plotHeight);
      final closeY = plotHeight - (((candle.close - paddedMin) / paddedRange) * plotHeight);
      final highY = plotHeight - (((candle.high - paddedMin) / paddedRange) * plotHeight);
      final lowY = plotHeight - (((candle.low - paddedMin) / paddedRange) * plotHeight);

      // Wick
      final wickPaint = Paint()
        ..color = color
        ..strokeWidth = 1.2;
      canvas.drawLine(Offset(centerX, highY), Offset(centerX, lowY), wickPaint);

      // Body
      final bodyTop = min(openY, closeY);
      final bodyBottom = max(openY, closeY);
      final bodyHeight = max(2.5, bodyBottom - bodyTop);
      final bodyRect = Rect.fromCenter(
        center: Offset(centerX, bodyTop + bodyHeight / 2),
        width: candleWidth,
        height: bodyHeight,
      );
      final bodyPaint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;
      canvas.drawRRect(RRect.fromRectAndRadius(bodyRect, const Radius.circular(1.5)), bodyPaint);
    }

    // 5. Active Price Dashed Reference Line & Pill Badge on Right Axis
    final activeIndex = (scrubIndex != null && scrubIndex! >= 0 && scrubIndex! < count)
        ? scrubIndex!
        : count - 1;
    final activeCandle = candles[activeIndex];
    final activePrice = activeCandle.close;
    final activeY = (plotHeight - (((activePrice - paddedMin) / paddedRange) * plotHeight)).clamp(6.0, plotHeight - 6.0);
    final isBull = activeCandle.close >= activeCandle.open;
    final badgeColor = isBull ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    // Dashed horizontal line across the chart
    final refLinePaint = Paint()
      ..color = badgeColor.withValues(alpha: 0.85)
      ..strokeWidth = 1.0;
    _drawDashedLine(canvas, Offset(0, activeY), Offset(plotWidth, activeY), refLinePaint, 4, 3);

    // Active Price Badge Pill on right axis
    final badgeRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(plotWidth + 3, activeY - 9, rightAxisWidth - 6, 18),
      const Radius.circular(4),
    );
    canvas.drawRRect(badgeRect, Paint()..color = badgeColor);

    final badgeTextSpan = TextSpan(
      text: CurrencyFormatter.formatNumberOnly(activePrice.round()),
      style: const TextStyle(
        color: Colors.white,
        fontSize: 10.0,
        fontWeight: FontWeight.w900,
      ),
    );
    final badgePainter = TextPainter(
      text: badgeTextSpan,
      textDirection: TextDirection.ltr,
    );
    badgePainter.layout();
    badgePainter.paint(
      canvas,
      Offset(
        plotWidth + 3 + ((rightAxisWidth - 6 - badgePainter.width) / 2),
        activeY - (badgePainter.height / 2),
      ),
    );

    // 6. Scrub crosshair if dragging
    if (scrubIndex != null && scrubIndex! >= 0 && scrubIndex! < count) {
      final centerX = (scrubIndex! * stepX) + (stepX / 2);
      final crossPaint = Paint()
        ..color = const Color(0xFF38BDF8)
        ..strokeWidth = 1.0;
      _drawDashedLine(canvas, Offset(centerX, 0), Offset(centerX, plotHeight), crossPaint, 3, 3);
      canvas.drawCircle(Offset(centerX, activeY), 4, Paint()..color = const Color(0xFF38BDF8));
    }

    // 7. TradingView subtle watermark icon on bottom-left
    _drawWatermark(canvas, plotHeight);
  }

  void _drawDashedLine(Canvas canvas, Offset p1, Offset p2, Paint paint, double dashWidth, double dashSpace) {
    final double dx = p2.dx - p1.dx;
    final double dy = p2.dy - p1.dy;
    final double distance = sqrt(dx * dx + dy * dy);
    if (distance == 0) return;
    final double unitX = dx / distance;
    final double unitY = dy / distance;

    double current = 0;
    while (current < distance) {
      final double next = min(current + dashWidth, distance);
      canvas.drawLine(
        Offset(p1.dx + unitX * current, p1.dy + unitY * current),
        Offset(p1.dx + unitX * next, p1.dy + unitY * next),
        paint,
      );
      current += dashWidth + dashSpace;
    }
  }

  void _drawWatermark(Canvas canvas, double plotHeight) {
    final tvRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(6, plotHeight - 20, 20, 14),
      const Radius.circular(3),
    );
    canvas.drawRRect(tvRect, Paint()..color = const Color(0xFF1E293B).withValues(alpha: 0.7));
    final tvText = TextPainter(
      text: const TextSpan(
        text: 'TV',
        style: TextStyle(color: Color(0xFF64748B), fontSize: 8.5, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    );
    tvText.layout();
    tvText.paint(canvas, Offset(10, plotHeight - 18));
  }

  void _paintPreIpo(Canvas canvas, double plotWidth, double plotHeight, double rightAxisWidth) {
    final centerY = plotHeight / 2;

    // 1. Horizontal dashed baseline in neutral slate
    final flatLinePaint = Paint()
      ..color = const Color(0xFF64748B)
      ..strokeWidth = 1.8
      ..style = PaintingStyle.stroke;
    _drawDashedLine(canvas, Offset(0, centerY), Offset(plotWidth, centerY), flatLinePaint, 6, 4);

    // 2. Single prominent gray dot in the center ("1 titik warna abu abu")
    final centerX = plotWidth / 2;
    final outerRing = Paint()
      ..color = const Color(0xFF94A3B8).withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;
    final innerDot = Paint()
      ..color = const Color(0xFF94A3B8)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(Offset(centerX, centerY), 11.0, outerRing);
    canvas.drawCircle(Offset(centerX, centerY), 5.5, innerDot);

    // 3. Right axis badge in neutral slate
    final badgeRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(plotWidth + 3, centerY - 9, rightAxisWidth - 6, 18),
      const Radius.circular(4),
    );
    canvas.drawRRect(badgeRect, Paint()..color = const Color(0xFF334155));

    final badgeText = TextPainter(
      text: TextSpan(
        text: CurrencyFormatter.formatNumberOnly(basePrice.round()),
        style: const TextStyle(color: Colors.white, fontSize: 10.0, fontWeight: FontWeight.w900),
      ),
      textDirection: TextDirection.ltr,
    );
    badgeText.layout();
    badgeText.paint(canvas, Offset(plotWidth + 3 + ((rightAxisWidth - 6 - badgeText.width) / 2), centerY - (badgeText.height / 2)));

    // 4. Center label above dot showing 1 lot price & offering price
    final lotPrice = basePrice * 100;
    final infoSpan = TextSpan(
      text: '1 Lot = IB ${CurrencyFormatter.formatNumberOnly(lotPrice.round())}\nHarga Penawaran: IB ${CurrencyFormatter.formatNumberOnly(basePrice.round())} / lbr',
      style: const TextStyle(
        color: Color(0xFFCBD5E1),
        fontSize: 11.0,
        fontWeight: FontWeight.bold,
        height: 1.4,
      ),
    );
    final infoPainter = TextPainter(
      text: infoSpan,
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
    );
    infoPainter.layout();
    infoPainter.paint(canvas, Offset(centerX - (infoPainter.width / 2), centerY - infoPainter.height - 14));

    // 5. Subtle footer in center below dot
    final noteSpan = const TextSpan(
      text: '🔒 Tahap E-IPO • Grafik fluktuasi aktif setelah listing',
      style: TextStyle(
        color: Color(0xFF64748B),
        fontSize: 9.5,
        fontWeight: FontWeight.w500,
      ),
    );
    final notePainter = TextPainter(text: noteSpan, textDirection: TextDirection.ltr);
    notePainter.layout();
    notePainter.paint(canvas, Offset(centerX - (notePainter.width / 2), centerY + 14));

    _drawWatermark(canvas, plotHeight);
  }

  @override
  bool shouldRepaint(covariant LiveStockCandleChartPainter oldDelegate) {
    return oldDelegate.candles != candles || oldDelegate.isUp != isUp || oldDelegate.scrubIndex != scrubIndex || oldDelegate.isPreIpo != isPreIpo;
  }
}

class LiveStockChartPainter extends CustomPainter {
  final List<double> points;
  final bool isUp;
  final int? scrubIndex;
  final bool isPreIpo;
  final double basePrice;

  LiveStockChartPainter({
    required this.points,
    required this.isUp,
    this.scrubIndex,
    this.isPreIpo = false,
    this.basePrice = 2500.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;

    const double rightAxisWidth = 54.0;
    const double bottomAxisHeight = 22.0;
    final double plotWidth = size.width - rightAxisWidth;
    final double plotHeight = size.height - bottomAxisHeight;

    if (isPreIpo) {
      _paintPreIpo(canvas, plotWidth, plotHeight, rightAxisWidth);
      return;
    }

    double minPrice = points.reduce((a, b) => a < b ? a : b);
    double maxPrice = points.reduce((a, b) => a > b ? a : b);
    if (maxPrice == minPrice) {
      maxPrice += 10.0;
      minPrice -= 10.0;
    }

    final double priceSpan = maxPrice - minPrice;
    final double paddedMin = max(1.0, minPrice - priceSpan * 0.06);
    final double paddedMax = maxPrice + priceSpan * 0.06;
    final double paddedRange = max(1.0, paddedMax - paddedMin);

    final double stepX = plotWidth / (points.length - 1);

    // 1. Horizontal dashed grid lines & right-side price labels
    const int gridLevels = 4;
    final gridLinePaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..strokeWidth = 0.8;

    for (int i = 0; i <= gridLevels; i++) {
      final double y = plotHeight * (i / gridLevels);
      final double priceAtY = paddedMax - ((y / plotHeight) * paddedRange);

      _drawDashedLine(canvas, Offset(0, y), Offset(plotWidth, y), gridLinePaint, 3, 3);

      final textSpan = TextSpan(
        text: CurrencyFormatter.formatNumberOnly(priceAtY.round()),
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 9.5,
          fontWeight: FontWeight.w500,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(plotWidth + 6, y - (textPainter.height / 2)));
    }

    // 2. Bottom time axis timestamps
    final now = DateTime.now();
    for (int i = 0; i < 4; i++) {
      final frac = i / 3.0;
      final x = frac * plotWidth;
      final dt = now.subtract(Duration(minutes: ((3 - i) * 30)));
      final timeStr = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      final timeSpan = TextSpan(
        text: timeStr,
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 9.0,
          fontWeight: FontWeight.w500,
        ),
      );
      final timePainter = TextPainter(
        text: timeSpan,
        textDirection: TextDirection.ltr,
      );
      timePainter.layout();
      timePainter.paint(
        canvas,
        Offset(x - (timePainter.width / 2), plotHeight + 5),
      );
    }

    // 3. Line Path and Stockbit Electric Blue Gradient Area Fill
    final path = Path();
    final fillPath = Path();

    for (int i = 0; i < points.length; i++) {
      final double x = i * stepX;
      final double y = plotHeight - (((points[i] - paddedMin) / paddedRange) * plotHeight);

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, plotHeight);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }

      if (i == points.length - 1) {
        fillPath.lineTo(x, plotHeight);
        fillPath.close();
      }
    }

    // Stockbit electric blue
    const lineColor = Color(0xFF0284C7);
    const lineGlow = Color(0xFF38BDF8);

    // Vertical gradient fill under curve
    final fillPaint = Paint()
      ..shader = LinearGradient(
        colors: [
          lineGlow.withValues(alpha: 0.35),
          lineColor.withValues(alpha: 0.0),
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, plotWidth, plotHeight))
      ..style = PaintingStyle.fill;

    canvas.drawPath(fillPath, fillPaint);

    // Stroke line
    final strokePaint = Paint()
      ..color = lineGlow
      ..strokeWidth = 2.4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(path, strokePaint);

    // 4. Active Price Dashed Reference Line & Pill Badge on Right Axis
    final activeIndex = (scrubIndex != null && scrubIndex! >= 0 && scrubIndex! < points.length)
        ? scrubIndex!
        : points.length - 1;
    final activePrice = points[activeIndex];
    final activeY = (plotHeight - (((activePrice - paddedMin) / paddedRange) * plotHeight)).clamp(6.0, plotHeight - 6.0);

    // Dashed horizontal line across plot width
    final refLinePaint = Paint()
      ..color = const Color(0xFF38BDF8).withValues(alpha: 0.85)
      ..strokeWidth = 1.0;
    _drawDashedLine(canvas, Offset(0, activeY), Offset(plotWidth, activeY), refLinePaint, 4, 3);

    // Active price pill badge on right axis (Stockbit electric blue)
    final badgeRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(plotWidth + 3, activeY - 9, rightAxisWidth - 6, 18),
      const Radius.circular(4),
    );
    canvas.drawRRect(badgeRect, Paint()..color = const Color(0xFF0284C7));

    final badgeTextSpan = TextSpan(
      text: CurrencyFormatter.formatNumberOnly(activePrice.round()),
      style: const TextStyle(
        color: Colors.white,
        fontSize: 10.0,
        fontWeight: FontWeight.w900,
      ),
    );
    final badgePainter = TextPainter(
      text: badgeTextSpan,
      textDirection: TextDirection.ltr,
    );
    badgePainter.layout();
    badgePainter.paint(
      canvas,
      Offset(
        plotWidth + 3 + ((rightAxisWidth - 6 - badgePainter.width) / 2),
        activeY - (badgePainter.height / 2),
      ),
    );

    // 5. Pulsating glow dot on active point
    final activeX = activeIndex * stepX;
    canvas.drawCircle(Offset(activeX, activeY), 7, Paint()..color = const Color(0xFF38BDF8).withValues(alpha: 0.35));
    canvas.drawCircle(Offset(activeX, activeY), 3.5, Paint()..color = const Color(0xFF38BDF8));

    // 6. Scrub crosshair if scrubbing
    if (scrubIndex != null && scrubIndex! >= 0 && scrubIndex! < points.length) {
      final crossPaint = Paint()
        ..color = const Color(0xFF38BDF8)
        ..strokeWidth = 1.0;
      _drawDashedLine(canvas, Offset(activeX, 0), Offset(activeX, plotHeight), crossPaint, 3, 3);
    }

    // 7. TradingView watermark in bottom left
    _drawWatermark(canvas, plotHeight);
  }

  void _drawDashedLine(Canvas canvas, Offset p1, Offset p2, Paint paint, double dashWidth, double dashSpace) {
    final double dx = p2.dx - p1.dx;
    final double dy = p2.dy - p1.dy;
    final double distance = sqrt(dx * dx + dy * dy);
    if (distance == 0) return;
    final double unitX = dx / distance;
    final double unitY = dy / distance;

    double current = 0;
    while (current < distance) {
      final double next = min(current + dashWidth, distance);
      canvas.drawLine(
        Offset(p1.dx + unitX * current, p1.dy + unitY * current),
        Offset(p1.dx + unitX * next, p1.dy + unitY * next),
        paint,
      );
      current += dashWidth + dashSpace;
    }
  }

  void _drawWatermark(Canvas canvas, double plotHeight) {
    final tvRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(6, plotHeight - 20, 20, 14),
      const Radius.circular(3),
    );
    canvas.drawRRect(tvRect, Paint()..color = const Color(0xFF1E293B).withValues(alpha: 0.7));
    final tvText = TextPainter(
      text: const TextSpan(
        text: 'TV',
        style: TextStyle(color: Color(0xFF64748B), fontSize: 8.5, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    );
    tvText.layout();
    tvText.paint(canvas, Offset(10, plotHeight - 18));
  }

  void _paintPreIpo(Canvas canvas, double plotWidth, double plotHeight, double rightAxisWidth) {
    final centerY = plotHeight / 2;

    // 1. Horizontal dashed baseline in neutral slate
    final flatLinePaint = Paint()
      ..color = const Color(0xFF64748B)
      ..strokeWidth = 1.8
      ..style = PaintingStyle.stroke;
    _drawDashedLine(canvas, Offset(0, centerY), Offset(plotWidth, centerY), flatLinePaint, 6, 4);

    // 2. Single prominent gray dot in the center ("1 titik warna abu abu")
    final centerX = plotWidth / 2;
    final outerRing = Paint()
      ..color = const Color(0xFF94A3B8).withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;
    final innerDot = Paint()
      ..color = const Color(0xFF94A3B8)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(Offset(centerX, centerY), 11.0, outerRing);
    canvas.drawCircle(Offset(centerX, centerY), 5.5, innerDot);

    // 3. Right axis badge in neutral slate
    final badgeRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(plotWidth + 3, centerY - 9, rightAxisWidth - 6, 18),
      const Radius.circular(4),
    );
    canvas.drawRRect(badgeRect, Paint()..color = const Color(0xFF334155));

    final badgeText = TextPainter(
      text: TextSpan(
        text: CurrencyFormatter.formatNumberOnly(basePrice.round()),
        style: const TextStyle(color: Colors.white, fontSize: 10.0, fontWeight: FontWeight.w900),
      ),
      textDirection: TextDirection.ltr,
    );
    badgeText.layout();
    badgeText.paint(canvas, Offset(plotWidth + 3 + ((rightAxisWidth - 6 - badgeText.width) / 2), centerY - (badgeText.height / 2)));

    // 4. Center label above dot showing 1 lot price & offering price
    final lotPrice = basePrice * 100;
    final infoSpan = TextSpan(
      text: '1 Lot = IB ${CurrencyFormatter.formatNumberOnly(lotPrice.round())}\nHarga Penawaran: IB ${CurrencyFormatter.formatNumberOnly(basePrice.round())} / lbr',
      style: const TextStyle(
        color: Color(0xFFCBD5E1),
        fontSize: 11.0,
        fontWeight: FontWeight.bold,
        height: 1.4,
      ),
    );
    final infoPainter = TextPainter(
      text: infoSpan,
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
    );
    infoPainter.layout();
    infoPainter.paint(canvas, Offset(centerX - (infoPainter.width / 2), centerY - infoPainter.height - 14));

    // 5. Subtle footer in center below dot
    final noteSpan = const TextSpan(
      text: '🔒 Tahap E-IPO • Grafik fluktuasi aktif setelah listing',
      style: TextStyle(
        color: Color(0xFF64748B),
        fontSize: 9.5,
        fontWeight: FontWeight.w500,
      ),
    );
    final notePainter = TextPainter(text: noteSpan, textDirection: TextDirection.ltr);
    notePainter.layout();
    notePainter.paint(canvas, Offset(centerX - (notePainter.width / 2), centerY + 14));

    _drawWatermark(canvas, plotHeight);
  }

  @override
  bool shouldRepaint(covariant LiveStockChartPainter oldDelegate) {
    return oldDelegate.points != points || oldDelegate.isUp != isUp || oldDelegate.scrubIndex != scrubIndex || oldDelegate.isPreIpo != isPreIpo;
  }
}
