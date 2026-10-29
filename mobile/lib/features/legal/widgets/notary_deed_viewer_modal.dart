import 'package:flutter/material.dart';
import '../../../utils/formatters.dart';

enum DeedType { ptEstablishment, ipoProspectus }

void showNotaryDeedModal(
  BuildContext context, {
  required DeedType deedType,
  required String companyName,
  required String symbol,
  required String founderName,
  required String sector,
  double? nominalCapital,
  double? ipoPrice,
  int? totalLots,
  double? floatingPct,
  String? deedNumber,
  String? bookbuildingDate,
  String? offeringDate,
  String? allotmentDate,
  String? listingDate,
}) {
  final now = DateTime.now();
  final autoDeedNo = deedNumber ??
      (deedType == DeedType.ptEstablishment
          ? 'NOT-PT/${now.year}/${now.month.toString().padLeft(2, '0')}/${(now.millisecondsSinceEpoch % 8999 + 1000)}'
          : 'NOT-IPO/${now.year}/CFX/${(now.millisecondsSinceEpoch % 8999 + 1000)}');

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => NotaryDeedViewerDialog(
      deedType: deedType,
      deedNumber: autoDeedNo,
      companyName: companyName,
      symbol: symbol,
      founderName: founderName,
      sector: sector,
      nominalCapital: nominalCapital ?? 15000000.0,
      ipoPrice: ipoPrice ?? 2500.0,
      totalLots: totalLots ?? 10000000,
      floatingPct: floatingPct ?? 10.0,
      bookbuildingDate: bookbuildingDate,
      offeringDate: offeringDate,
      allotmentDate: allotmentDate,
      listingDate: listingDate,
    ),
  );
}

class NotaryDeedViewerDialog extends StatelessWidget {
  final DeedType deedType;
  final String deedNumber;
  final String companyName;
  final String symbol;
  final String founderName;
  final String sector;
  final double nominalCapital;
  final double ipoPrice;
  final int totalLots;
  final double floatingPct;
  final String? bookbuildingDate;
  final String? offeringDate;
  final String? allotmentDate;
  final String? listingDate;

  const NotaryDeedViewerDialog({
    super.key,
    required this.deedType,
    required this.deedNumber,
    required this.companyName,
    required this.symbol,
    required this.founderName,
    required this.sector,
    required this.nominalCapital,
    required this.ipoPrice,
    required this.totalLots,
    required this.floatingPct,
    this.bookbuildingDate,
    this.offeringDate,
    this.allotmentDate,
    this.listingDate,
  });

  @override
  Widget build(BuildContext context) {
    final isIpo = deedType == DeedType.ipoProspectus;
    final publicLots = (totalLots * (floatingPct / 100.0)).round();
    final strategicPct = (100.0 - floatingPct - 50.0).clamp(0.0, 40.0);
    final founderPct = 100.0 - floatingPct - strategicPct;

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFF334155),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),

          // Header action
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isIpo ? Icons.corporate_fare_rounded : Icons.history_edu_rounded,
                      color: const Color(0xFFF59E0B),
                      size: 22,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      isIpo ? 'Akta Notaris Prospektus IPO' : 'Akta Notaris Pendirian PT',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
          const Divider(color: Color(0xFF1E293B), height: 1),

          // Parchment Document ScrollView
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFF080D1A),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Official Seal Header
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFF59E0B), width: 1.2),
                      ),
                      child: const Icon(Icons.verified_user_rounded, color: Color(0xFFF59E0B), size: 30),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'REPUBLIK FEDERASI CAPITAL',
                      style: TextStyle(
                        color: Color(0xFFF59E0B),
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2,
                      ),
                    ),
                    const Text(
                      'KANTOR NOTARIS & PEJABAT PEMBUAT AKTA KORPORASI RESMI',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, letterSpacing: 1),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'YUDI APRIADI',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    const Text(
                      'Surat Keputusan Menteri Hukum: AHU-00921.AH.02.01 • Wilayah Ibukota Federasi',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 8.5),
                    ),
                    const SizedBox(height: 12),
                    const Divider(color: Color(0xFF334155), thickness: 1),
                    const SizedBox(height: 8),

                    // Deed Title & Number
                    Text(
                      isIpo
                          ? 'AKTA PERUBAHAN ANGGARAN DASAR & REGISTRASI IPO'
                          : 'AKTA NOTARIS PENDIRIAN PERSEROAN TERBATAS',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF38BDF8),
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'NOMOR: $deedNumber',
                        style: const TextStyle(
                          color: Color(0xFFCBD5E1),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Legal Opening Text
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Pada hari ini, dihadapan saya, Notaris berwenang di Wilayah Hukum Republik Federasi, telah hadir menghadap dengan identitas sah:',
                        style: TextStyle(color: const Color(0xFFCBD5E1).withValues(alpha: 0.9), fontSize: 10.5, height: 1.4),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Identitas Penghadap (Pendiri)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldRow('Nama Lengkap Pendiri:', founderName, isBold: true),
                          const SizedBox(height: 4),
                          _buildFieldRow('Kedudukan Jabatan:', 'Direktur Utama & Pemegang Saham Pengendali'),
                          const SizedBox(height: 4),
                          _buildFieldRow('Nama Entitas PT:', companyName, color: const Color(0xFF34D399), isBold: true),
                          const SizedBox(height: 4),
                          _buildFieldRow('Kode Ticker Bursa:', symbol, color: const Color(0xFF38BDF8), isBold: true),
                          const SizedBox(height: 4),
                          _buildFieldRow('Klasifikasi Sektor:', sector),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Klausul Anggaran Dasar
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isIpo ? 'KLAUSUL PASAL PERUBAHAN STATUS GO PUBLIC (CFX)' : 'KLAUSUL PASAL ANGGARAN DASAR PERSEROAN',
                            style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          if (!isIpo) ...[
                            _buildClause('Pasal 1 (Nama & Kedudukan):', 'Perseroan berbadan hukum resmi dengan nama $companyName, berkedudukan sah di Republik Federasi.'),
                            _buildClause('Pasal 2 (Modal Dasar):', 'Modal disetor perdana untuk kas operasional kerja sebesar IB ${CurrencyFormatter.formatNumberOnly(nominalCapital)} telah disetorkan secara penuh dan riil.'),
                            _buildClause('Pasal 3 (Hak Suara Pendiri):', 'Pendiri utama memegang 100% hak suara perseroan sebelum dilakukannya penawaran saham perdana (IPO).'),
                          ] else ...[
                            _buildClause('Pasal 1 (Status Publik Tbk):', 'Perseroan secara resmi mengubah status menjadi Perseroan Terbuka ($companyName) untuk mencatatkan saham di Bursa Efek Capital Federation (CFX).'),
                            _buildClause('Pasal 2 (Struktur Kepemilikan):', 'Saham dilepas ke Publik Ritel sebanyak ${floatingPct.toStringAsFixed(0)}% (${CurrencyFormatter.formatNumberOnly(publicLots)} Lot), Mitra Strategis ${strategicPct.toStringAsFixed(0)}%, dan Pendiri Pengendali ${founderPct.toStringAsFixed(0)}%.'),
                            _buildClause('Pasal 3 (Harga & Dana Ekspansi):', 'Harga Penawaran IPO ditetapkan IB ${CurrencyFormatter.formatNumberOnly(ipoPrice)} per lembar. 75% dana segar masuk kas perseroan untuk ekspansi dan 25% dividen pendiri.'),
                            if (bookbuildingDate != null || listingDate != null)
                              _buildClause('Pasal 4 (Jadwal Emisi):', 'Bookbuilding: ${bookbuildingDate ?? '-'} • Offering: ${offeringDate ?? '-'} • Allotment: ${allotmentDate ?? '-'} • Listing Bursa: ${listingDate ?? '-'} (07:00 WIB).'),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Stempel Notaris & Tanda Tangan
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // QR Verification
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(Icons.qr_code_2_rounded, size: 48, color: Colors.black),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'VERIFIKASI OTENTIK AHU\nKEMENTERIAN HUKUM FEDERASI',
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 7, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),

                        // Stempel Emas Notaris & TTD
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'TERDAFTAR & DISAHKAN',
                                style: TextStyle(color: Color(0xFFF59E0B), fontSize: 8.5, fontWeight: FontWeight.w900),
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Notaris Pembuat Akta,',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Yudi Apriadi',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900, decoration: TextDecoration.underline),
                            ),
                            Text(
                              'Surat Keputusan No: AHU-00921.AH',
                              style: TextStyle(color: const Color(0xFF94A3B8).withValues(alpha: 0.8), fontSize: 8),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Bottom Close Button
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('TUTUP SALINAN AKTA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _buildFieldRow(String label, String value, {Color? color, bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              color: color ?? Colors.white,
              fontSize: 10.5,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ],
    );
  }

  static Widget _buildClause(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 9.5, fontWeight: FontWeight.bold)),
          const SizedBox(height: 1),
          Text(body, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 9, height: 1.3)),
        ],
      ),
    );
  }
}
