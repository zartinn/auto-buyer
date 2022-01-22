import { useState, MouseEvent, useEffect } from 'react';
import { GoPlay } from 'react-icons/go';
import { FaStopCircle } from 'react-icons/fa';
import "./job-row.scss";
import {
  Tr,
  Td,
  Icon,
} from "@chakra-ui/react";
import { Job } from "@auto-buyer-shared/types";
import { useJobEvents } from '../../../hooks/useJobEvents';

interface JobProps {
  job: Job;
  message: string;
}

export function JobRow({ job, message }: JobProps) {
  const [isExpanded, setExpanded] = useState(false);
  const [isRunning, setRunning] = useState(job.running);
  const [messages, setMessages] = useState('');

  useJobEvents(setMessages, job, setRunning);

  async function toggleJob(job: Job, event: MouseEvent) {
    event.stopPropagation();
    if (job.running) {
      window.electron.send("stop-job", job);
      job.running = false;
    } else {
      window.electron.send("start-job", job);
      job.running = true;
    }
    setRunning(() => job.running);
  }

  return (
    <>
      <Tr className="job-row" onClick={() => setExpanded((state) => !state)}>
        <Td>
          <div className={`circle ${isRunning ? "active" : ""}`}></div>
        </Td>
        <Td>
          <Icon
            className="icon"
            as={isRunning ? FaStopCircle : GoPlay}
            onClick={(event) => toggleJob(job, event)}
          ></Icon>
        </Td>
        <Td>{job.name}</Td>
        <Td>{job.platform}</Td>
        <Td>{job.magic.toString()}</Td>
      </Tr>
      {isExpanded && (
        <Tr className="job-row-expandable">
          <Td colSpan={5}>
            <div>{messages}</div>
          </Td>
        </Tr>
      )}
    </>
  );
}
