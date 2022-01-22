import './Header.scss';
import { Text } from '@chakra-ui/react';
import { SettingsIcon } from '@chakra-ui/icons';
import { BillingContext } from '../../shared/BillingContext';
import { useContext, useState } from 'react';
import { BillingModal } from '../modals/billing-modal/billing-modal';
import { Billing } from '@auto-buyer-shared/types';




export function Header() {
  const [modalOpen, setModalOpen] = useState<boolean>(() => false);
  const {billings, setBillings} = useContext(BillingContext);

  async function closeModal(billing: Billing) {
    if (billing) {
      const result = await window.electron.invoke("save-billings", [...billings, billing]);
      if (result) {
        setBillings((oldBillings) => {
          const newBillings = [...oldBillings, billing];
          return newBillings;
        });
      }
    }
    setModalOpen(false);
  }

  return (
    <header>
      <Text fontSize="3xl">Auto-Buyer</Text>
      <SettingsIcon boxSize="8" onClick={ () => setModalOpen(() => true)}></SettingsIcon>
      {modalOpen && (
        <BillingModal onModalClose={(billing) => closeModal(billing)}></BillingModal>
      )}
    </header>
  );
}