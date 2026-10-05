import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface PinModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ visible, onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const DEFAULT_PIN = '1234'; // Mã PIN tạm thời mặc định cho MVP

  const handleVerify = () => {
    if (pin === DEFAULT_PIN) {
      setPin('');
      onSuccess();
    } else {
      Alert.alert('Lỗi xác thực', 'Mã PIN không đúng (Mặc định: 1234)');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>🔒 Mật mã Ghi chú Riêng tư</Text>
          <Text style={styles.subtitle}>Nhập mã PIN để mở khóa nội dung (Mặc định: 1234)</Text>
          
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            placeholder="Nhập mã PIN"
            autoFocus
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => { setPin(''); onCancel(); }}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleVerify}>
              <Text style={styles.confirmText}>Mở khóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelText: {
    color: '#555',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});
