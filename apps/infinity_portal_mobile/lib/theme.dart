import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppPalette {
  static const midnight = Color(0xFF111827);
  static const ink = Color(0xFF24324A);
  static const cobalt = Color(0xFF2563EB);
  static const electric = Color(0xFFE11D48);
  static const sky = Color(0xFF38BDF8);
  static const mint = Color(0xFF60D066);
  static const forest = Color(0xFF1A4D3A);
  static const amber = Color(0xFFF59E0B);
  static const paper = Color(0xFFFFF7ED);
  static const shell = Color(0xFFFFE4E6);
  static const card = Color(0xFFFDFEFF);
  static const border = Color(0xFFE5E7EB);
  static const danger = Color(0xFFD9485A);
  static const warning = Color(0xFFF0A329);
  static const success = Color(0xFF29A867);
}

class AppTheme {
  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppPalette.cobalt,
      brightness: Brightness.light,
      primary: AppPalette.cobalt,
      secondary: AppPalette.electric,
      surface: AppPalette.card,
      error: AppPalette.danger,
    );
    final textTheme = GoogleFonts.plusJakartaSansTextTheme(
      const TextTheme(
        displaySmall: TextStyle(
          fontSize: 34,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
          color: AppPalette.midnight,
          height: 1.08,
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
          color: AppPalette.midnight,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
          color: AppPalette.midnight,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppPalette.midnight,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: AppPalette.ink,
          height: 1.35,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: AppPalette.ink,
          height: 1.4,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(0xFF5C6E91),
        ),
      ),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: Colors.transparent,
      splashFactory: InkSparkle.splashFactory,
      textTheme: textTheme,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.92),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: AppPalette.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: AppPalette.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: AppPalette.cobalt, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: AppPalette.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: AppPalette.danger, width: 1.4),
        ),
        hintStyle: const TextStyle(
          color: Color(0xFF7B8BA8),
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppPalette.cobalt,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(0, 54),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            letterSpacing: 0,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 52),
          foregroundColor: AppPalette.midnight,
          side: const BorderSide(color: AppPalette.border),
          backgroundColor: Colors.white.withValues(alpha: 0.72),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white.withValues(alpha: 0.88),
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: AppPalette.border),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 78,
        backgroundColor: Colors.white.withValues(alpha: 0.82),
        shadowColor: Colors.black.withValues(alpha: 0.06),
        indicatorColor: AppPalette.shell,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 10,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w600,
            letterSpacing: -0.1,
            color: states.contains(WidgetState.selected)
                ? AppPalette.cobalt
                : const Color(0xFF63758E),
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white.withValues(alpha: 0.9),
        selectedColor: AppPalette.shell,
        side: const BorderSide(color: AppPalette.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        labelStyle: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: AppPalette.midnight,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppPalette.card,
        elevation: 0,
        showDragHandle: true,
        modalBarrierColor: Color(0x7A07132A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(34)),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppPalette.border,
        thickness: 1,
      ),
    );
  }
}
