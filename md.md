import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import '../core/utils/auth_store.dart';
import '../core/theme/colors.dart';

class ExamsScreen extends StatefulWidget {
  const ExamsScreen({super.key});
  @override
  State<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends State<ExamsScreen> {
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
    return (code == 'en' || code == 'tr')
        ? TextDirection.ltr
        : TextDirection.rtl;
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
    final language = st?['language'] as String?;
    _language = language;

    if (!show) {
      setState(() {
        _error = 'غير مسموح بعرض الاختبارات حالياً';
        _isLoading = false;
      });
      return;
    }
    if (language == null) {
      setState(() {
        _error = 'يرجى مراجعة الإدارة لتحديد اللغة';
        _isLoading = false;
      });
      return;
    }

    final exams = await _svc.examGroupsByLanguage(language);
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
      child: WillPopScope(
        onWillPop: () async {
          Navigator.of(
            context,
          ).pushNamedAndRemoveUntil('/dashboard', (route) => false);
          return false;
        },
        child: Scaffold(
          backgroundColor: bgGrey,
          appBar: AppBar(
            leading: IconButton(
              icon: const BackButtonIcon(),
              onPressed: () => Navigator.of(
                context,
              ).pushNamedAndRemoveUntil('/dashboard', (route) => false),
            ),
            title: const Text(
              'مركز الاختبارات',
              style: TextStyle(fontWeight: FontWeight.bold),
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
      ),
    );
  }

  // واجهة عرض الاختبارات
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
                  // شريط جانبي ملون لتمييز الاختبار
                  Container(width: 6, color: goldAccent),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            e['title'] ?? 'مجموعة غير معنونة',
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
                                Icons.category_outlined,
                                'مجموعة اختبارات',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  // زر فتح المجموعة
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(
                          context,
                          '/exams/group',
                          arguments: {'groupId': e['id'], 'title': e['title']},
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryBlue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                      ),
                      child: const Text('افتح'),
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

  // ويدجت صغيرة للمعلومات (المدة، النوع)
  Widget _buildInfoTag(IconData icon, String label) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
      ],
    );
  }

  // واجهة الخطأ أو القيود
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

  // واجهة لا يوجد اختبارات
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
            'لا توجد مجموعات متاحة حالياً',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
