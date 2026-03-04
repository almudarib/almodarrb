import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/supabase_service.dart';
import '../core/utils/auth_store.dart';
import '../core/theme/colors.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> {
  final _svc = SupabaseService();
  List<Map<String, dynamic>> _sessions = [];
  bool _isLoading = true;
  String? _error;

  final Color primaryBlue = AppColors.brandTeal;
  final Color goldAccent = AppColors.brandGold;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final sid = await AuthStore.getCurrentStudentId();
      String? lang;
      if (sid != null) {
        final student = await _svc.fetchStudent(sid);
        lang = (student?['language'] as String?);
      }
      var sessions = await _svc.listSessions(
        isActive: true,
        sortBy: 'created_at',
        ascending: false,
        page: 1,
        perPage: 200,
        language: lang,
      );
      if (sessions.isEmpty) {
        sessions = await _svc.listSessions(
          isActive: true,
          sortBy: 'created_at',
          ascending: false,
          page: 1,
          perPage: 200,
        );
      }
      setState(() {
        _sessions = sessions;
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'تعذر تحميل الجلسات';
        _isLoading = false;
      });
    }
  }

  bool _isYouTubeUrl(String url) {
    final u = Uri.tryParse(url);
    if (u == null) return false;
    final host = u.host.toLowerCase();
    return host.contains('youtube.com') || host.contains('youtu.be');
  }

  Future<void> _openSession(Map<String, dynamic> s) async {
    final url = s['video_url'] as String? ?? '';
    final title = s['title'] as String? ?? 'مشغل الفيديو';
    if (url.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('رابط الفيديو غير متوفر')),
      );
      return;
    }
    if (_isYouTubeUrl(url)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم فتح الفيديو على YouTube')),
        );
      }
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      return;
    }
    if (!mounted) return;
    Navigator.pushNamed(
      context,
      '/video',
      arguments: {'videoUrl': url, 'title': title},
    );
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.of(context)
                .pushNamedAndRemoveUntil('/dashboard', (route) => false),
          ),
          title: const Text('الدروس التعليمية'),
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
        ),
        body: _isLoading
            ? Center(child: CircularProgressIndicator(color: primaryBlue))
            : _error != null
                ? Center(
                    child: Text(_error!,
                        style: const TextStyle(color: Colors.red)),
                  )
                : _sessions.isEmpty
                    ? const Center(child: Text('لا توجد جلسات فيديو متاحة'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _sessions.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final s = _sessions[index];
                          return Container(
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
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor:
                                        primaryBlue.withOpacity(0.1),
                                    child: Text(
                                      '${(s['order_number'] ?? index + 1)}',
                                      style: TextStyle(
                                        color: primaryBlue,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          s['title'] ?? 'درس',
                                          style: TextStyle(
                                            color: primaryBlue,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'اللغة: ${s['language'] ?? ''}',
                                          style: const TextStyle(
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  ElevatedButton(
                                    onPressed: () => _openSession(s),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: goldAccent,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                    ),
                                    child: const Text('عرض الفيديو'),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
