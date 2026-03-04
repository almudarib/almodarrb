import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import '../core/theme/colors.dart';
import '../core/utils/auth_store.dart';

class GroupExamsScreen extends StatefulWidget {
  final int groupId;
  final String? title;
  const GroupExamsScreen({super.key, required this.groupId, this.title});
  @override
  State<GroupExamsScreen> createState() => _GroupExamsScreenState();
}

class _GroupExamsScreenState extends State<GroupExamsScreen> {
  final _svc = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _exams = [];
  String? _error;
  String? _language;

  final Color primaryBlue = AppColors.brandTeal;
  final Color goldAccent = AppColors.brandGold;
  final Color bgGrey = AppColors.brandLightBg;

  TextDirection _computeTextDirection(BuildContext context) {
    final lang = _language?.toUpperCase();
    if (lang == 'EN' || lang == 'TR') return TextDirection.ltr;
    if (lang != null) return TextDirection.rtl;
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return (code == 'en' || code == 'tr') ? TextDirection.ltr : TextDirection.rtl;
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    final sid = await AuthStore.getCurrentStudentId();
    if (sid == null) {
      setState(() {
        _error = 'لا يوجد طالب مرتبط بالحساب';
        _isLoading = false;
      });
      return;
    }
    final st = await _svc.fetchStudent(sid);
    final show = st?['show_exams'] == true;
    _language = (st?['language'] as String?);
    if (!show) {
      setState(() {
        _error = 'غير مسموح بعرض الاختبارات حالياً';
        _isLoading = false;
      });
      return;
    }
    final exams = await _svc.examsByGroup(widget.groupId);
    exams.sort((a, b) {
      final as = a['created_at'] as String?;
      final bs = b['created_at'] as String?;
      if (as != null && bs != null) {
        final ad = DateTime.tryParse(as);
        final bd = DateTime.tryParse(bs);
        if (ad != null && bd != null) return ad.compareTo(bd);
      }
      final ai = a['id'] as int? ?? 0;
      final bi = b['id'] as int? ?? 0;
      return ai.compareTo(bi);
    });
    setState(() {
      _exams = exams;
      _isLoading = false;
    });
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: _computeTextDirection(context),
      child: Scaffold(
        backgroundColor: bgGrey,
        appBar: AppBar(
          leading: IconButton(
            icon: const BackButtonIcon(),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            widget.title ?? 'اختبارات المجموعة',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          centerTitle: true,
          elevation: 0,
        ),
        body: _isLoading
            ? Center(child: CircularProgressIndicator(color: primaryBlue))
            : _error != null
            ? _buildErrorState()
            : _exams.isEmpty
            ? _buildEmptyState()
            : _buildExamsList(),
      ),
    );
  }

  Widget _buildExamsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _exams.length,
      itemBuilder: (context, index) {
        final e = _exams[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(15),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(15),
            child: IntrinsicHeight(
              child: Row(
                children: [
                  Container(width: 6, color: goldAccent),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            e['title'] ?? 'اختبار غير معنون',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: primaryBlue,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              _buildInfoTag(
                                Icons.timer_outlined,
                                '${e['duration_minutes']} دقيقة',
                              ),
                              const SizedBox(width: 15),
                              _buildInfoTag(
                                Icons.help_outline_rounded,
                                'متعدد الخيارات',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: ElevatedButton(
                      onPressed: () => Navigator.pushNamed(
                        context,
                        '/quiz',
                        arguments: {'examId': e['id']},
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryBlue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                      ),
                      child: const Text('ابدأ'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInfoTag(IconData icon, String label) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
      ],
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(30),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.lock_person_rounded,
              size: 80,
              color: goldAccent.withOpacity(0.5),
            ),
            const SizedBox(height: 20),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.brandBlueGray,
              ),
            ),
            const SizedBox(height: 20),
            TextButton(
              onPressed: _load,
              child: Text('تحديث الصفحة', style: TextStyle(color: primaryBlue)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.assignment_turned_in_outlined,
            size: 70,
            color: Colors.grey[300],
          ),
          const SizedBox(height: 15),
          const Text(
            'لا توجد اختبارات متاحة حالياً',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
