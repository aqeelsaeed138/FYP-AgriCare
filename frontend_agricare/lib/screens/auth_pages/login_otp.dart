import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class LoginEnterOtpScreen extends StatefulWidget {
  const LoginEnterOtpScreen({super.key});

  @override
  State createState() => _LoginEnterOtpScreenState();
}

class _LoginEnterOtpScreenState extends State<LoginEnterOtpScreen> {
  final _otpController = TextEditingController();
  String? _otpError;
  bool _showError = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _validateAndLogin() {
    String otp = _otpController.text.trim();
    
    setState(() {
      _showError = true;
      if (otp.isEmpty || otp.length != 4) {
        _otpError = 'Enter a valid 4-digit code.';
      } else {
        _otpError = null;
      }
    });

    if (_otpError == null) {
      Navigator.pushReplacementNamed(context, '/dashboard');
    }
  }

  @override
  Widget build(BuildContext context) {
    final String contact = ModalRoute.of(context)!.settings.arguments as String;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: Color(0xFF2D5016)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Icon
                Center(
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: Color(0xFFE8F5E0),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.verified_user_outlined,
                      size: 40,
                      color: Color(0xFF4A7C2C),
                    ),
                  ),
                ),
                SizedBox(height: 32),
                
                // Title
                Text(
                  'Verify Your Identity',
                  style: Theme.of(context).textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 12),
                Text(
                  'Enter the 4-digit code sent to',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 4),
                Text(
                  contact,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF4A7C2C),
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 40),
                
                // OTP Field
                Text(
                  'Verification Code',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2D5016),
                  ),
                ),
                SizedBox(height: 8),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 8,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                  decoration: InputDecoration(
                    hintText: '••••',
                    counterText: '',
                    errorText: _showError ? _otpError : null,
                  ),
                  onChanged: (value) {
                    if (_showError) {
                      setState(() {
                        if (value.isEmpty || value.length != 4) {
                          _otpError = 'Enter a valid 4-digit code.';
                        } else {
                          _otpError = null;
                        }
                      });
                    }
                  },
                ),
                SizedBox(height: 32),
                
                // Login Button
                ElevatedButton(
                  onPressed: _validateAndLogin,
                  child: Text('Log In'),
                ),
                SizedBox(height: 24),
                
                // Resend Link
                Center(
                  child: TextButton(
                    onPressed: () {
                      // Mock resend - just show a snackbar
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Code resent to $contact'),
                          backgroundColor: Color(0xFF4A7C2C),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                    child: Text(
                      'Didn\'t receive code? Resend',
                      style: TextStyle(
                        color: Color(0xFF4A7C2C),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}