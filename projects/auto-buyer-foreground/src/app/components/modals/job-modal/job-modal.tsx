import { useContext, useEffect, useRef, useState } from "react";
import "./job-modal.scss";
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
  useDisclosure,
  Select,
  Checkbox,
} from "@chakra-ui/react";
import { Job, PlatformArr, jobInputs, getPlatformInfo, Platform } from "@auto-buyer-shared/types";
import { BillingContext } from "../../../shared/BillingContext";

interface JobProps {
  onModalClose: (job: Job) => void;
}

export function JobModal(props: JobProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [platform, setPlatform] = useState(() => null);
  const formData = useRef<any>({});
  const options = PlatformArr.map((plat, index) => (
    <option key={'option_' + index} value={plat}>{plat}</option>
  ));
  const { billings } = useContext(BillingContext);

  const billingOptions = billings.map((b, index) => <option key={'option_' + index} value={b.name}>{b.name}</option>)
  const inputs = jobInputs.map((inputObj, key) => <Input key={'input_' + key} ref={(el) => (formData.current[inputObj.key] = el)} placeholder={inputObj.placeholder} />)

  useEffect(() => {
    onOpen();
  }, []);

  const closeModal = (apply: boolean) => {
    let job: Job;
    if (apply) {
      const platformInfo = getPlatformInfo(formData.current.platform.value, formData.current.url.value, formData.current.magic?.checked);
      job = {
        name: formData.current.name.value,
        billingName: formData.current.billing.value,
        magic: formData.current.magic?.checked || false,
        url: formData.current.url.value,
        host: platformInfo?.host,
        id: platformInfo?.id,
        productText: formData.current.productText.value?.split(';'),
        platform: platformInfo?.platform,
        maxPrice: +formData.current.maxPrice.value,
        test: formData.current.test.checked,
        cookies: platformInfo?.cookies,
        running: false,
      };
    }
    // @ts-ignore
    props.onModalClose(job);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => closeModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create new Job</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <div className="job-modal">
              <Select
                aria-label="select"
                ref={(el) => (formData.current.platform = el)}
                onChange={() => { setPlatform(formData.current.platform.value) }}
                placeholder="Select site"
              >
                {options}
              </Select>
              <Select
                aria-label="select"
                ref={(el) => (formData.current.billing = el)}
                placeholder="Select billing information"
              >
                {billingOptions}
              </Select>
              {platform === Platform.AMD &&
                <Checkbox
                  ref={(el) => (formData.current.magic = el)}
                  aria-label="checkbox" size="md" defaultIsChecked
                >Use magic link?</Checkbox>}
              <Checkbox
                ref={(el) => (formData.current.test = el)}
                aria-label="checkbox" size="md"
              >Test job? (Will not click final checkout button)</Checkbox>
              {inputs}
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
