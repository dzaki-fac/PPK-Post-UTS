import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export function ConfirmationModal({
  visible,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  confirmVariant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmationModalProps) {
  const getConfirmButtonStyle = () => {
    switch (confirmVariant) {
      case 'danger':
        return styles.btnDanger;
      case 'success':
        return styles.btnSuccess;
      case 'primary':
      default:
        return styles.btnPrimary;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onCancel} />
        <View style={styles.sheetContainer}>
          <View style={styles.indicatorBar} />

          <Text style={styles.title}>{title}</Text>

          {description ? <Text style={styles.description}>{description}</Text> : null}

          {children ? <View style={styles.contentWrap}>{children}</View> : null}

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.btnCancel, pressed && styles.btnPressed]}
              onPress={onCancel}
              disabled={isLoading}>
              <Text style={styles.btnCancelText}>{cancelText}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnConfirm,
                getConfirmButtonStyle(),
                pressed && styles.btnPressed,
                isLoading && styles.btnDisabled,
              ]}
              onPress={onConfirm}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnConfirmText}>{confirmText}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  indicatorBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  contentWrap: {
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  btnPrimary: {
    backgroundColor: '#EA580C', // LocalGuide Red-Orange
  },
  btnSuccess: {
    backgroundColor: '#16A34A',
  },
  btnDanger: {
    backgroundColor: '#DC2626',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
