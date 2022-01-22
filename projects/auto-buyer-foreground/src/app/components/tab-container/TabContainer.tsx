import {
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Tfoot,
} from "@chakra-ui/react";
import { useContext, useEffect, useState } from "react";
import { JobRow } from './job-row/job.row';
import "./TabContainer.scss";
import { JobModal } from "../modals/job-modal/job-modal";
import { useJobEvents } from "../../hooks/useJobEvents";
import { Job } from "@auto-buyer-shared/types";
import { BillingContext } from "../../shared/BillingContext";

export function TabContainer() {
  const [jobs, setJobs] = useState<Job[]>(() => []);
  const [messages, setMessages] = useState<any>({});
  const [modalOpen, setModalOpen] = useState<boolean>(() => false);

  useEffect(() => {
    window.electron.invoke("get-jobs").then((jobs: Job[]) => {
      setJobs(() => jobs);
    });
  }, []);

  const createNewJob = () => {
    setModalOpen(true);
  };

  function closeModal(job: Job) {
    if (job) {
      setJobs((oldJobs) => {
        const newJobs = [...oldJobs, job];
        window.electron.invoke("save-jobs", newJobs);
        return [...newJobs];
      });
    }
    setModalOpen(false);
  }

  function removeJob(job: Job) {
    setJobs((prevJobs) => {
      const newJobs = prevJobs.filter((j) => j.name !== job.name);
      window.electron.invoke("save-jobs", newJobs);
      return newJobs;
    });
  }

  return (
    <Table size="sm" className="table">
        <Thead>
            <Tr>
            <Th>Status</Th>
            <Th>Action</Th>
            <Th>Name</Th>
            <Th>Platform</Th>
            <Th>Magic</Th>
            </Tr>
        </Thead>
        <Tbody>
            {jobs.map((j, index) => <JobRow key={index} job={j}></JobRow>)}
        </Tbody>
    </Table>
  );
}
