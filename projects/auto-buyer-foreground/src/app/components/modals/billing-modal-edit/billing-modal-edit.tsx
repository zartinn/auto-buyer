import { useEffect, useRef } from "react";
import "./billing-modal.scss";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Textarea,
  useDisclosure,
} from "@chakra-ui/react";
import { Billing, billingInputs } from "@auto-buyer-shared/types";

interface BillingProps {
  onModalClose: (billing: Billing) => void;
}

export function BillingModalEdit(props: BillingProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const formData = useRef<any>({});

  useEffect(() => {
    onOpen();
  }, []);

  const closeModal = (apply: boolean) => {
    let billing: Billing = {};
    if (apply) {
      for (const input of billingInputs) {
        billing[input.key] = formData.current[input.key].value;
      }
    }
    // @ts-ignore
    props.onModalClose(billing);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => closeModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add billing details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <div className="billing-modal">
              <Textarea ref={(el) => formData.current.json = el}></Textarea>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => closeModal(true)}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
