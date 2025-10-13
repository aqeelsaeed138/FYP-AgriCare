import 'package:flutter/material.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State createState() =>
      _LoginEnterDetailsScreenState();
}

class _LoginEnterDetailsScreenState extends State<LoginScreen> {
  final _contactController = TextEditingController();
  String? _contactError;
  bool _showError = false;

  @override
  void dispose() {
    _contactController.dispose();
    super.dispose();
  }

  void _validateAndContinue() {
    setState(() {
      _showError = true;
      _contactError = _contactController.text.trim().isEmpty
          ? 'Email or phone is required.'
          : null;
    });

    if (_contactError == null) {
      Navigator.pushNamed(
        context,
        '/login-otp',
        arguments: _contactController.text.trim(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo/Icon
                Center(
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: Color(0xFFE8F5E0),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.agriculture,
                      size: 50,
                      color: Color(0xFF4A7C2C),
                    ),
                  ),
                ),
                SizedBox(height: 32),
                
                // Title
                Text(
                  'Welcome Back',
                  style: Theme.of(context).textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 8),
                Text(
                  'Log in to continue to Agri-Care',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 40),
                
                // Email/Phone Field
                Text(
                  'Email or Phone',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2D5016),
                  ),
                ),
                SizedBox(height: 8),
                TextField(
                  controller: _contactController,
                  decoration: InputDecoration(
                    hintText: 'Enter your email or phone',
                    prefixIcon: Icon(Icons.contact_mail_outlined, color: Color(0xFF4A7C2C)),
                    errorText: _showError ? _contactError : null,
                  ),
                  onChanged: (value) {
                    if (_showError) {
                      setState(() {
                        _contactError = value.trim().isEmpty
                            ? 'Email or phone is required.'
                            : null;
                      });
                    }
                  },
                ),
                SizedBox(height: 32),
                
                // Continue Button
                ElevatedButton(
                  onPressed: _validateAndContinue,
                  child: Text('Continue'),
                ),
                SizedBox(height: 24),
                
                // Signup Link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'New here? ',
                      style: TextStyle(color: Color(0xFF666666)),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.pushReplacementNamed(context, '/signup');
                      },
                      child: Text(
                        'Create an account',
                        style: TextStyle(
                          color: Color(0xFF4A7C2C),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}