import 'package:google_sign_in/google_sign_in.dart';

class GoogleAuthService {
  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    serverClientId: '831901063105-t398d2hvg6dlbru9gdntbpqgaj0oetnc.apps.googleusercontent.com',
  );

  /// Menjalankan otentikasi Google Sign-In asli di perangkat Android/Web
  static Future<Map<String, dynamic>?> signIn() async {
    try {
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account == null) return null; // Pengguna membatalkan dialog pemilihan akun

      final GoogleSignInAuthentication auth = await account.authentication;
      return {
        'idToken': auth.idToken,
        'accessToken': auth.accessToken,
        'email': account.email,
        'displayName': account.displayName,
        'photoUrl': account.photoUrl,
        'googleId': account.id,
      };
    } catch (e) {
      return {'error': e.toString()};
    }
  }

  /// Keluar dari sesi Google
  static Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
  }
}
