import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:record/record.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:http_parser/http_parser.dart';
import 'package:audioplayers/audioplayers.dart';

void main() {
  runApp(const BharatVoiceApp());
}

class BharatVoiceApp extends StatelessWidget {
  const BharatVoiceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      home: const VoiceHome(),
    );
  }
}

class VoiceHome extends StatefulWidget {
  const VoiceHome({super.key});

  @override
  State<VoiceHome> createState() => _VoiceHomeState();
}

class _VoiceHomeState extends State<VoiceHome> {
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();
  bool _recording = false;
  bool _playing = false;
  bool _loading = false;
  String _status = 'Tap microphone';
  List<Map<String, dynamic>> _chats = [];
  String _sessionId = '';
  String _currentLanguage = 'Auto';
  final ScrollController _scrollController = ScrollController();

  // ✅ CORRECTED: Use your physical phone IP
  static const String _backendUrl = 'http://10.0.2.2:3000/voice';

  @override
  void initState() {
    super.initState();
    _initAudio();
  }

  Future<void> _initAudio() async {
    try {
      await _recorder.hasPermission();
    } catch (e) {
      print('Permission error: $e');
    }
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      await _stopRecording();
    } else {
      await _startRecording();
    }
  }

  Future<void> _startRecording() async {
    try {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.wav';
      
      await _recorder.start(
        RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 16000,
          numChannels: 1,
        ),
        path: path,
      );
      
      setState(() {
        _recording = true;
        _status = 'Listening... Speak clearly';
      });
      
    } catch (e) {
      setState(() {
        _status = 'Microphone error';
        _recording = false;
      });
    }
  }

  Future<void> _stopRecording() async {
    try {
      final path = await _recorder.stop();
      
      setState(() {
        _recording = false;
        _loading = true;
        _status = 'Processing...';
      });
      
      if (path != null) {
        await _processAudio(path);
      } else {
        setState(() {
          _status = 'No audio recorded';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _status = 'Error';
        _recording = false;
        _loading = false;
      });
    }
  }

  Future<void> _processAudio(String filePath) async {
    print('🎤 Processing audio file: $filePath');
    
    try {
      // ✅ CORRECTED: Use the constant URL
      final uri = Uri.parse(_backendUrl);
      print('🔗 Connecting to: $uri');
      
      // Create request
      var request = http.MultipartRequest('POST', uri);
      
      // Add session ID if needed
      if (_sessionId.isEmpty) {
        _sessionId = DateTime.now().millisecondsSinceEpoch.toString();
      }
      request.headers['session-id'] = _sessionId;
      
      // Read audio file
      final audioFile = File(filePath);
      if (!await audioFile.exists()) {
        setState(() {
          _status = 'Audio file not found';
          _loading = false;
        });
        return;
      }
      
      final audioBytes = await audioFile.readAsBytes();
      print('📁 File size: ${audioBytes.length} bytes');
      
      // Add audio file
      request.files.add(
        http.MultipartFile.fromBytes(
          'audio',
          audioBytes,
          filename: 'recording.wav',
          contentType: MediaType('audio', 'wav'),
        ),
      );
      
      // Send request with timeout
      print('📡 Sending request...');
      final streamedResponse = await request.send().timeout(Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);
      
      print('✅ Response status: ${response.statusCode}');
      print('📦 Response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        
        if (data['success'] == true) {
          final transcript = data['transcript']?.toString() ?? '';
          final reply = data['reply']?.toString() ?? '';
          final hasAudio = data['hasAudio'] == true;
          final audioContent = data['audioContent']?.toString();
          final responseLanguage = data['language']?.toString() ?? 'en';
          final intent = data['intent']?.toString() ?? 'greeting';
          final confidence = data['confidence']?.toDouble() ?? 0.0;
          
          // Map language
          String languageDisplay = 'Auto';
          Color languageColor = Colors.grey;
          
          if (responseLanguage == 'ta') {
            languageDisplay = 'தமிழ்';
            languageColor = Colors.orange;
          } else if (responseLanguage == 'hi') {
            languageDisplay = 'हिंदी';
            languageColor = Colors.green;
          } else if (responseLanguage == 'en') {
            languageDisplay = 'English';
            languageColor = Colors.blue;
          }
          
          // Add to chat history
          _chats.add({
            'query': transcript.isNotEmpty ? transcript : 'Voice message',
            'reply': reply,
            'language': languageDisplay,
            'languageColor': languageColor.value,
            'time': DateTime.now().toString().substring(11, 16),
            'intent': intent,
            'confidence': confidence,
          });
          
          setState(() {
            _currentLanguage = languageDisplay;
            _loading = false;
            _status = 'Response ready';
          });
          
          // Scroll to bottom
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_scrollController.hasClients) {
              _scrollController.animateTo(
                _scrollController.position.maxScrollExtent,
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeOut,
              );
            }
          });
          
          // Play audio if available
          if (hasAudio && audioContent != null && audioContent.isNotEmpty) {
            await _playResponseAudio(audioContent);
          } else {
            await Future.delayed(const Duration(seconds: 1));
            setState(() => _status = 'Tap microphone');
          }
          
          // Clean up
          try {
            await File(filePath).delete();
          } catch (e) {
            print('⚠️ Could not delete temp file: $e');
          }
          
        } else {
          final errorMsg = data['reply']?.toString() ?? 'Unknown error';
          setState(() {
            _status = 'Error: $errorMsg';
            _loading = false;
          });
        }
      } else {
        setState(() {
          _status = 'Server error: ${response.statusCode}';
          _loading = false;
        });
      }
    } catch (e) {
      print('❌ Network error: $e');
      setState(() {
        _status = 'Network error: ${e.toString().split(':').first}';
        _loading = false;
      });
    }
  }

  Future<void> _playResponseAudio(String base64Audio) async {
    try {
      setState(() {
        _playing = true;
        _status = 'Speaking...';
      });
      
      final bytes = base64.decode(base64Audio);
      final dir = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final audioFile = File('${dir.path}/response_$timestamp.mp3');
      
      await audioFile.writeAsBytes(bytes);
      print('🔊 Playing audio file: ${audioFile.path}');
      
      await _player.play(DeviceFileSource(audioFile.path));
      
      // Listen for completion
      _player.onPlayerComplete.listen((_) async {
        setState(() {
          _playing = false;
          _status = 'Tap microphone';
        });
        
        // Delete file after delay
        await Future.delayed(Duration(seconds: 2));
        if (await audioFile.exists()) {
          try {
            await audioFile.delete();
            print('🗑️ Deleted audio file');
          } catch (e) {
            print('⚠️ Could not delete audio file: $e');
          }
        }
      });
      
    } catch (e) {
      print('❌ Audio playback error: $e');
      setState(() {
        _playing = false;
        _status = 'Audio error';
      });
    }
  }

  void _clearChat() {
    setState(() {
      _chats.clear();
      _sessionId = '';
      _currentLanguage = 'Auto';
      _status = 'Tap microphone';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF1E1E1E),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.volume_up, color: Colors.green, size: 28),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '🇮🇳 BharatVoice',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Multilingual Voice Assistant',
                            style: TextStyle(
                              color: Colors.greenAccent[400],
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF252525),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[800]!),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _recording ? Icons.mic_off : 
                          _playing ? Icons.volume_up :
                          _loading ? Icons.hourglass_top : Icons.mic,
                          color: _recording ? Colors.red :
                                 _playing ? Colors.blue :
                                 _loading ? Colors.orange : Colors.green,
                          size: 22,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _status,
                            style: TextStyle(
                              color: _recording ? Colors.red :
                                     _playing ? Colors.blue :
                                     _loading ? Colors.orange : Colors.white,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        if (_currentLanguage != 'Auto')
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: _currentLanguage == 'தமிழ்' ? Colors.orange.withOpacity(0.2) :
                                     _currentLanguage == 'हिंदी' ? Colors.green.withOpacity(0.2) :
                                     _currentLanguage == 'English' ? Colors.blue.withOpacity(0.2) :
                                     Colors.grey.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: _currentLanguage == 'தமிழ்' ? Colors.orange :
                                       _currentLanguage == 'हिंदी' ? Colors.green :
                                       _currentLanguage == 'English' ? Colors.blue :
                                       Colors.grey,
                              ),
                            ),
                            child: Text(
                              _currentLanguage,
                              style: TextStyle(
                                color: _currentLanguage == 'தமிழ்' ? Colors.orange :
                                       _currentLanguage == 'हिंदी' ? Colors.green :
                                       _currentLanguage == 'English' ? Colors.blue :
                                       Colors.grey,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // Chat History
            Expanded(
              child: _chats.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.1),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.green),
                              ),
                              child: const Icon(
                                Icons.mic,
                                size: 50,
                                color: Colors.green,
                              ),
                            ),
                            const SizedBox(height: 20),
                            const Text(
                              'Welcome to BharatVoice',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'Speak in English, Tamil or Hindi',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 30),
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              alignment: WrapAlignment.center,
                              children: [
                                _buildSuggestionChip('Hello', 'English'),
                                _buildSuggestionChip('வணக்கம்', 'தமிழ்'),
                                _buildSuggestionChip('नमस्ते', 'हिंदी'),
                                _buildSuggestionChip('What time?', 'English'),
                                _buildSuggestionChip('நேரம் என்ன?', 'தமிழ்'),
                                _buildSuggestionChip('समय क्या है?', 'हिंदी'),
                              ],
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(12),
                      itemCount: _chats.length,
                      itemBuilder: (context, index) {
                        final chat = _chats[index];
                        return _buildChatBubble(chat, index);
                      },
                    ),
            ),
            
            // Bottom Controls
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF1E1E1E),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  // Clear Button
                  if (_chats.isNotEmpty)
                    GestureDetector(
                      onTap: _clearChat,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.delete, color: Colors.red, size: 16),
                            SizedBox(width: 5),
                            Text(
                              'Clear Chat',
                              style: TextStyle(
                                color: Colors.red,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  
                  const Spacer(),
                  
                  // Mic Button
                  GestureDetector(
                    onTap: _loading || _playing ? null : _toggleRecording,
                    child: Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: _recording ? Colors.red : 
                               _playing ? Colors.blue : Colors.green,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: (_recording ? Colors.red : 
                                   _playing ? Colors.blue : Colors.green)
                                .withOpacity(0.5),
                            blurRadius: 10,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Icon(
                            _playing ? Icons.volume_up : 
                            _recording ? Icons.stop : Icons.mic,
                            color: Colors.white,
                            size: 30,
                          ),
                          if (_loading)
                            CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 3,
                            ),
                        ],
                      ),
                    ),
                  ),
                  
                  const Spacer(),
                  
                  // Chat Count
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue),
                    ),
                    child: Text(
                      '${_chats.length} chats',
                      style: const TextStyle(
                        color: Colors.blue,
                        fontSize: 12,
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

  Widget _buildSuggestionChip(String text, String language) {
    Color color = Colors.grey;
    if (language == 'English') color = Colors.blue;
    if (language == 'தமிழ்') color = Colors.orange;
    if (language == 'हिंदी') color = Colors.green;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 13,
        ),
      ),
    );
  }

  Widget _buildChatBubble(Map<String, dynamic> chat, int index) {
    final lang = chat['language'] ?? 'Auto';
    final languageColor = Color(chat['languageColor'] ?? Colors.grey.value);
    final confidence = chat['confidence'] ?? 0.0;
    final intent = chat['intent'] ?? 'greeting';
    
    return Column(
      children: [
        // User Message
        Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.person,
                  color: Colors.blue,
                  size: 16,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'You',
                            style: TextStyle(
                              color: Colors.blue,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            chat['time']!,
                            style: const TextStyle(
                              color: Colors.grey,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Text(
                        chat['query']!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        
        // Assistant Response
        Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.assistant,
                  color: Colors.green,
                  size: 16,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'BharatVoice',
                            style: TextStyle(
                              color: Colors.green,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: languageColor.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              lang,
                              style: TextStyle(
                                color: languageColor,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Text(
                        chat['reply']!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                      ),
                      if (intent != 'greeting')
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'Intent: $intent (${(confidence * 100).toStringAsFixed(1)}% confident)',
                            style: const TextStyle(
                              color: Colors.grey,
                              fontSize: 10,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _recorder.dispose();
    _player.dispose();
    super.dispose();
  }
}