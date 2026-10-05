import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../context/AuthContext';
import { syncService } from '../services/syncService';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthContext();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const handleSync = async () => {
    if (!accessToken) {
      Alert.alert('Chưa đăng nhập', 'Vui lòng đăng nhập để thực hiện đồng bộ dữ liệu.');
      return;
    }

    try {
      setSyncing(true);
      // Push local data to server
      const newSyncAt = await syncService.pushAllData(accessToken, lastSyncTime || undefined);
      // Pull latest server changes
      await syncService.pullAllData(accessToken, newSyncAt || lastSyncTime || undefined);

      const nowStr = new Date().toLocaleTimeString('vi-VN');
      setLastSyncTime(nowStr);
      Alert.alert('Thành công', `Đồng bộ dữ liệu hoàn tất lúc ${nowStr}`);
    } catch {
      Alert.alert('Lỗi đồng bộ', 'Không thể đồng bộ dữ liệu với máy chủ. Vui lòng thử lại sau.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          logout();
          Alert.alert('Thông báo', 'Đã đăng xuất tài khoản.');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>⚙️ Cài Đặt & Tài Khoản</Text>

      {/* Account Info Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin Tài Khoản</Text>
        {user ? (
          <View>
            <Text style={styles.infoText}>
              👤 Tài khoản: <Text style={styles.boldText}>{user.username}</Text>
            </Text>
            <Text style={styles.infoText}>
              🆔 ID: <Text style={styles.subText}>{user.id}</Text>
            </Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Đăng Xuất</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.infoText}>Bạn đang ở chế độ Ngoại tuyến (Offline Guest).</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.authButton, styles.loginBtn]}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.authButtonText}>Đăng Nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authButton, styles.registerBtn]}
                onPress={() => router.push('/register')}
              >
                <Text style={styles.authButtonText}>Đăng Ký</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Sync Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Đồng Bộ Dữ Liệu Server</Text>
        <Text style={styles.infoText}>
          Tự động hoặc thủ công đồng bộ Ghi chú & Nhiệm vụ hàng ngày với SQL Server backend.
        </Text>
        {lastSyncTime && (
          <Text style={styles.syncStatusText}>🕒 Lần đồng bộ gần nhất: {lastSyncTime}</Text>
        )}

        <TouchableOpacity
          style={[styles.syncButton, (!user || syncing) && styles.disabledButton]}
          onPress={handleSync}
          disabled={!user || syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>
              {user ? '🔄 Đồng Bộ Ngay' : '🔒 Đăng nhập để Đồng bộ'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Về Ứng Dụng</Text>
        <Text style={styles.infoText}>📱 Note & Daily Task App (Offline-First)</Text>
        <Text style={styles.infoText}>⚡ Expo SDK 57 / React Native</Text>
        <Text style={styles.infoText}>💾 Local: SQLite | Server: SQL Server + Node.js</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  contentContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#4A5568',
    marginBottom: 8,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#2B6CB0',
  },
  subText: {
    fontSize: 13,
    color: '#718096',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  authButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginBtn: {
    backgroundColor: '#3182CE',
  },
  registerBtn: {
    backgroundColor: '#38A169',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: '#E53E3E',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  syncButton: {
    backgroundColor: '#805AD5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  syncStatusText: {
    fontSize: 13,
    color: '#38A169',
    fontWeight: '600',
    marginTop: 4,
  },
});
