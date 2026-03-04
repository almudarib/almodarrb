import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import '../core/utils/auth_store.dart';
import '../core/theme/colors.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  final _svc = SupabaseService();
  final PageController _pageController = PageController();
  final ValueNotifier<int> _remainingSecondsNotifier = ValueNotifier<int>(0);
  final Map<String, Future<String?>> _imageFutureCache = {};
  final Map<int, bool> _imageReady = {};

  Map<String, dynamic>? _exam;
  List<Map<String, dynamic>> _questions = [];
  Map<int, String> _answers = {};
  int _currentIndex = 0;
  int? _studentId;
  String? _language;
  int _remainingSeconds = 0;
  Timer? _timer;
  int _elapsedSeconds = 0;
  String? _error;

  final Color primaryBlue = AppColors.brandTeal;
  final Color goldAccent = AppColors.brandGold;

  Future<void> _init() async {
    final sid = await AuthStore.getCurrentStudentId();
    if (sid == null) {
      setState(() => _error = 'لا يوجد طالب مرتبط بالحساب');
      return;
    }

    final student = await _svc.fetchStudent(sid);
    if (student?['show_exams'] != true) {
      setState(() => _error = 'غير مسموح بالاختبار لهذا الطالب');
      return;
    }
    _language = (student?['language'] as String?);

    final args = ModalRoute.of(context)?.settings.arguments;
    final examIdArg = (args is Map) ? args['examId'] as int? : null;
    if (examIdArg == null) {
      setState(() => _error = 'لم يتم اختيار اختبار');
      return;
    }

    final exam = await _svc.getExam(examIdArg);
    if (exam == null) {
      setState(() => _error = 'اختبار غير موجود');
      return;
    }

    final questions = await _svc.examQuestions(exam['id'] as int);
    questions.sort((a, b) {
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
      _studentId = sid;
      _exam = exam;
      _questions = questions;
      _remainingSeconds = (exam['duration_minutes'] as int) * 60;
    });
    _remainingSecondsNotifier.value = _remainingSeconds;
    _startTimer();
  }

  TextDirection _computeTextDirection(BuildContext context) {
    final lang = (_language ?? (_exam?['language'] as String?))?.toUpperCase();
    if (lang == 'EN' || lang == 'TR') return TextDirection.ltr;
    if (lang != null) return TextDirection.rtl;
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return (code == 'en' || code == 'tr')
        ? TextDirection.ltr
        : TextDirection.rtl;
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      final v = _remainingSecondsNotifier.value;
      if (v > 0) {
        _remainingSecondsNotifier.value = v - 1;
        _remainingSeconds = v - 1;
        _elapsedSeconds++;
      } else {
        t.cancel();
        _submit();
      }
    });
  }

  void _choose(int qid, String option) {
    if (_answers.containsKey(qid)) return; // منع تغيير الإجابة بعد ظهور النتيجة
    setState(() {
      _answers[qid] = option;
    });
  }

  Future<void> _submit() async {
    _timer?.cancel();
    int correct = 0;
    for (final q in _questions) {
      final selected = _answers[q['id']];
      if (selected != null &&
          selected.toUpperCase() ==
              (q['correct_option'] as String).toUpperCase()) {
        correct++;
      }
    }
    final score = _questions.isEmpty
        ? 0
        : ((correct * 100) / _questions.length).round();

    if (_studentId != null && _exam != null) {
      await _svc.submitExamResult(
        _studentId!,
        _exam!['id'],
        score,
        (_elapsedSeconds / 60).round(),
      );
      if (mounted) {
        _showResultDialog(score);
      }
    }
  }

  void _showResultDialog(int score) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('انتهى الاختبار', textAlign: TextAlign.center),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.stars, color: AppColors.brandGold, size: 60),
            const SizedBox(height: 10),
            Text(
              'درجتك النهائية هي:',
              style: TextStyle(color: Colors.grey[600]),
            ),
            Text(
              '$score%',
              style: TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.bold,
                color: primaryBlue,
              ),
            ),
          ],
        ),
        actions: [
          Center(
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // إغلاق الديالوج
                Navigator.pop(context); // العودة للشاشة السابقة
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 30),
              ),
              child: const Text('العودة للقائمة'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _remainingSecondsNotifier.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: _computeTextDirection(context),
      child: Scaffold(
        backgroundColor: AppColors.brandLightBg,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 1,
          leading: IconButton(
            icon: Icon(Icons.close, color: primaryBlue),
            onPressed: () => Navigator.pop(context),
          ),
          title: Column(
            children: [
              Text(
                _exam?['title'] ?? 'جاري التحميل...',
                style: TextStyle(
                  color: primaryBlue,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'سؤال ${_currentIndex + 1} من ${_questions.length}',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
          actions: [
            ValueListenableBuilder<int>(
              valueListenable: _remainingSecondsNotifier,
              builder: (context, value, _) {
                final minutes = (value ~/ 60).toString().padLeft(2, '0');
                final seconds = (value % 60).toString().padLeft(2, '0');
                final isTimeLow = value < 60;
                return Container(
                  margin: const EdgeInsets.all(10),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: isTimeLow ? Colors.red[50] : AppColors.brandTeal13,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Row(
                      children: [
                        Icon(
                          Icons.timer_sharp,
                          size: 18,
                          color: isTimeLow ? Colors.red : primaryBlue,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          '$minutes:$seconds',
                          style: TextStyle(
                            color: isTimeLow ? Colors.red : primaryBlue,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
        body: _error != null ? Center(child: Text(_error!)) : _buildQuizBody(),
      ),
    );
  }

  Widget _buildQuizBody() {
    if (_questions.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        LinearProgressIndicator(
          value: (_currentIndex + 1) / _questions.length,
          backgroundColor: Colors.grey[200],
          color: goldAccent,
          minHeight: 5,
        ),
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            physics: const NeverScrollableScrollPhysics(),
            onPageChanged: (index) {
              setState(() => _currentIndex = index);
              _prefetchNextImage(index + 1);
            },
            itemCount: _questions.length,
            itemBuilder: (context, index) =>
                _buildQuestionPage(_questions[index]),
          ),
        ),
        _buildFooter(),
      ],
    );
  }

  Widget _buildQuestionPage(Map<String, dynamic> q) {
    final id = q['id'] as int;
    final selected = _answers[id];
    final correctOpt = (q['correct_option'] as String).toUpperCase();
    final isAnswered = selected != null;
    final urlRef = q['image_url'] as String?;
    final hasImage = _svc.isValidImageRef(urlRef);
    final canAnswer = !hasImage || (_imageReady[id] == true);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            q['question'] ?? '',
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.bold,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          if (hasImage)
            Expanded(
              child: Center(
                child: FractionallySizedBox(
                  widthFactor: 0.8,
                  child: _buildQuestionImage(id, q['image_url'] as String?),
                ),
              ),
            ),
          if (hasImage) const SizedBox(height: 16),
          if (!canAnswer)
            Row(
              children: [
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 8),
                const Text('جاري تحميل الصورة...'),
              ],
            ),
          ...['A', 'B', 'C', 'D'].map((opt) {
            final isCurrentOptSelected = selected == opt;
            final isThisCorrectOpt = opt == correctOpt;
            Color cardColor = Colors.white;
            Color borderColor = Colors.grey[200]!;
            if (isAnswered) {
              if (isThisCorrectOpt) {
                cardColor = Colors.green[50]!;
                borderColor = Colors.green;
              } else if (isCurrentOptSelected && !isThisCorrectOpt) {
                cardColor = Colors.red[50]!;
                borderColor = Colors.red;
              }
            } else if (!canAnswer) {
              cardColor = Colors.grey[100]!;
              borderColor = Colors.grey[300]!;
            }
            return GestureDetector(
              onTap: canAnswer ? () => _choose(id, opt) : null,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.only(bottom: 15),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 5,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: isAnswered && isThisCorrectOpt
                          ? Colors.green
                          : (!canAnswer && !isAnswered
                                ? Colors.grey[300]
                                : (isCurrentOptSelected
                                      ? borderColor
                                      : Colors.grey[100])),
                      child: Text(
                        opt,
                        style: TextStyle(
                          color:
                              isAnswered && isThisCorrectOpt ||
                                  isCurrentOptSelected
                              ? Colors.white
                              : (!canAnswer && !isAnswered
                                    ? Colors.grey
                                    : Colors.grey[700]),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 15),
                    Expanded(
                      child: Text(
                        q['option_${opt.toLowerCase()}'] ?? '',
                        style: TextStyle(
                          fontSize: 16,
                          color: !canAnswer && !isAnswered
                              ? Colors.grey
                              : (isAnswered && isThisCorrectOpt
                                    ? Colors.green[900]
                                    : Colors.black87),
                          fontWeight: isAnswered && isThisCorrectOpt
                              ? FontWeight.bold
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                    if (isAnswered && isThisCorrectOpt)
                      const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 20,
                      ),
                    if (isCurrentOptSelected && !isThisCorrectOpt)
                      const Icon(Icons.cancel, color: Colors.red, size: 20),
                  ],
                ),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildQuestionImage(int questionId, String? urlRef) {
    if (!_svc.isValidImageRef(urlRef)) {
      return const SizedBox.shrink();
    }
    if (urlRef != null && urlRef.startsWith('data:image')) {
      final parts = urlRef.split(',');
      final base64Data = parts.length > 1 ? parts[1] : '';
      if (base64Data.isEmpty) {
        return const SizedBox.shrink();
      }
      try {
        final decoded = base64Decode(base64Data);
        _imageReady[questionId] = true;
        return LayoutBuilder(
          builder: (context, constraints) {
            return ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox.expand(
                child: FittedBox(
                  fit: BoxFit.contain,
                  alignment: Alignment.center,
                  child: Image.memory(
                    decoded,
                    filterQuality: FilterQuality.medium,
                  ),
                ),
              ),
            );
          },
        );
      } catch (_) {
        return const SizedBox.shrink();
      }
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final dpr = MediaQuery.of(context).devicePixelRatio;
        final targetWidth = (constraints.maxWidth * dpr).round();
        final cacheKey = '$questionId:$targetWidth';
        final future = _imageFutureCache[cacheKey] ??= _svc
            .resolveQuestionImageTransformed(
              questionId,
              urlRef,
              width: targetWidth,
              quality: 70,
            );
        return FutureBuilder<String?>(
          future: future,
          builder: (context, snap) {
            final state = snap.connectionState;
            final resolved = snap.data;
            if (state == ConnectionState.waiting) {
              if (_imageReady[questionId] != false) {
                _imageReady[questionId] = false;
              }
              return const SizedBox.expand(
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (resolved == null || resolved.isEmpty) {
              if (_imageReady[questionId] != true) {
                _imageReady[questionId] = true;
              }
              return const SizedBox.shrink();
            }
            return ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox.expand(
                child: FittedBox(
                  fit: BoxFit.contain,
                  alignment: Alignment.center,
                  child: Image.network(
                    resolved,
                    cacheWidth: targetWidth,
                    filterQuality: FilterQuality.medium,
                    loadingBuilder: (context, child, progress) {
                      if (progress == null) {
                        if (_imageReady[questionId] != true) {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (mounted) {
                              setState(() => _imageReady[questionId] = true);
                            }
                          });
                        }
                        return child;
                      } else {
                        if (_imageReady[questionId] != false) {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (mounted) {
                              setState(() => _imageReady[questionId] = false);
                            }
                          });
                        }
                      }
                      final expected = progress.expectedTotalBytes;
                      final loaded = progress.cumulativeBytesLoaded;
                      final pct = expected != null && expected > 0
                          ? (loaded / expected).clamp(0, 1.0)
                          : null;
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const CircularProgressIndicator(),
                            if (pct != null) ...[
                              const SizedBox(height: 8),
                              Text('${(pct * 100).round()}%'),
                            ],
                          ],
                        ),
                      );
                    },
                    errorBuilder: (_, __, ___) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) {
                          setState(() => _imageReady[questionId] = true);
                        }
                      });
                      return const SizedBox.shrink();
                    },
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildImageError({VoidCallback? onRetry}) {
    return Container(
      height: 150,
      width: double.infinity,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.broken_image, color: Colors.grey),
          const SizedBox(height: 8),
          const Text('تعذر تحميل الصورة', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    final bool isLast = _currentIndex == _questions.length - 1;
    final bool canProceed = _answers.containsKey(
      _questions[_currentIndex]['id'],
    );
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          if (_currentIndex > 0)
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new),
              onPressed: () => _pageController.previousPage(
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeInOut,
              ),
            ),
          const Spacer(),
          ElevatedButton(
            onPressed: isLast
                ? (canProceed ? _submit : null)
                : (canProceed
                      ? () => _pageController.nextPage(
                          duration: const Duration(milliseconds: 400),
                          curve: Curves.easeInOut,
                        )
                      : null),
            style: ElevatedButton.styleFrom(
              backgroundColor: goldAccent,
              foregroundColor: primaryBlue,
              disabledBackgroundColor: Colors.grey[200],
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: Text(
              isLast ? 'إرسال النتيجة' : 'التالي',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          const Spacer(),
          const SizedBox.shrink(),
        ],
      ),
    );
  }

  void _prefetchNextImage(int nextIndex) {
    if (nextIndex < 0 || nextIndex >= _questions.length) return;
    final q = _questions[nextIndex];
    final id = q['id'] as int;
    final ref = q['image_url'] as String?;
    if (!_svc.isValidImageRef(ref)) return;
    final dpr = MediaQuery.of(context).devicePixelRatio;
    final w = MediaQuery.of(context).size.width;
    final targetWidth = (w * dpr).round();
    final key = '$id:$targetWidth';
    _imageFutureCache[key] ??= _svc.resolveQuestionImageTransformed(
      id,
      ref,
      width: targetWidth,
      quality: 70,
    );
  }
}
