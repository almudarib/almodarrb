import 'package:flutter/material.dart';
import '../services/video.dart';

class VideoScreeen extends StatelessWidget {
  final String videoUrl;
  final String? title;

  const VideoScreeen({super.key, required this.videoUrl, this.title});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: SupabaseVideoPage(videoUrl: videoUrl, title: title),
    );
  }
}
