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

  const getIcon = () => {
    switch (confirmVariant) {
      case 'danger':
        return { emoji: '⚠️', bg: '#FEE2E2', border: '#FCA5A5' };
      case 'success':
        return { emoji: '✓', bg: '#DCFCE7', border: '#86EFAC' };
      case 'primary':
      default:
        return { emoji: '📋', bg: '#FFF7ED', border: '#FED7AA' };
    }
  };

  const iconInfo = getIcon();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onCancel} />
        <View style={styles.popupCard}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: iconInfo.bg, borderColor: iconInfo.border },
            ]}>
            <Text style={styles.iconEmoji}>{iconInfo.emoji}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>

          {description ? <Text style={styles.description}>{description}</Text> : null}

          {children ? <View style={styles.contentWrap}>{children}</View> : null}

          <View style={styles.actionRow}>
            {cancelText ? (
              <Pressable
                style={({ pressed }) => [styles.btnCancel, pressed && styles.btnPressed]}
                onPress={onCancel}
                disabled={isLoading}
                accessibilityRole="button">
                <Text style={styles.btnCancelText}>{cancelText}</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.btnConfirm,
                getConfirmButtonStyle(),
                pressed && styles.btnPressed,
                isLoading && styles.btnDisabled,
              ]}
              onPress={onConfirm}
              disabled={isLoading}
              accessibilityRole="button">
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFill,
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxWidth: 460,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconEmoji: {
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 16,
  },
  contentWrap: {
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#EA580C',
  },
  btnDanger: {
    backgroundColor: '#DC2626',
  },
  btnSuccess: {
    backgroundColor: '#16A34A',
  },
  btnConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
