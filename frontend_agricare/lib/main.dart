import 'package:flutter/material.dart';
import "auth_pages/login.dart";
import "auth_pages/signup.dart";

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Navigation Demo',
      debugShowCheckedModeBanner: false,

      // Define named routes
      routes: {
        '/': (context) => LoginScreen(),     // Default route
        '/signup': (context) => SignupScreen(),
      },
    );
  }
}
