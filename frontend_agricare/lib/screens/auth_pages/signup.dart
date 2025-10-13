import 'package:flutter/material.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});
  @override
  State createState() =>
      _SignupEnterDetailsScreenState();
}

class _SignupEnterDetailsScreenState extends State<SignupScreen> {
  // final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _contactController = TextEditingController();
  
  String? _nameError;
  String? _contactError;
  bool _showErrors = false;

  @override
  void dispose() {
    _nameController.dispose();
    _contactController.dispose();
    super.dispose();
  }

  void _validateAndContinue() {
    setState(() {
      _showErrors = true;
      _nameError = _nameController.text.trim().isEmpty ? 'Name is required.' : null;
      _contactError = _contactController.text.trim().isEmpty
          ? 'Email or phone is required.'
          : null;
    });

    if (_nameError == null && _contactError == null) {
      Navigator.pushNamed(
        context,
        '/signup-otp',
        arguments: _contactController.text.trim(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // bool isFormValid = _nameController.text.trim().isNotEmpty &&
        _contactController.text.trim().isNotEmpty;

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
                      Icons.eco,
                      size: 50,
                      color: Color(0xFF4A7C2C),
                    ),
                  ),
                ),
                SizedBox(height: 32),
                
                // Title
                Text(
                  'Welcome to Agri-Care',
                  style: Theme.of(context).textTheme.headlineMedium,
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 8),
                Text(
                  'Create your account to get started',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 40),
                
                // Name Field
                Text(
                  'Name',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2D5016),
                  ),
                ),
                SizedBox(height: 8),
                TextField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    hintText: 'Enter your name',
                    prefixIcon: Icon(Icons.person_outline, color: Color(0xFF4A7C2C)),
                    errorText: _showErrors ? _nameError : null,
                  ),
                  onChanged: (value) {
                    if (_showErrors) {
                      setState(() {
                        _nameError = value.trim().isEmpty ? 'Name is required.' : null;
                      });
                    }
                  },
                ),
                SizedBox(height: 24),
                
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
                    errorText: _showErrors ? _contactError : null,
                  ),
                  onChanged: (value) {
                    if (_showErrors) {
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
                
                // Login Link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Already have an account? ',
                      style: TextStyle(color: Color(0xFF666666)),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.pushReplacementNamed(context, '/login');
                      },
                      child: Text(
                        'Log in',
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