import React from 'react';
import { Modal, ModalProps, View } from 'react-native';
import { LOCALIZATION_ROOT_STYLES, useLocalization } from '../../localization';

/** Modal content is hosted outside the app's native layout root. */
export function LocalizedModal({ children, ...props }: ModalProps) {
  const { direction } = useLocalization();
  return (
    <Modal {...props}>
      <View style={LOCALIZATION_ROOT_STYLES[direction]}>{children}</View>
    </Modal>
  );
}
