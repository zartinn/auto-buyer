import { useEffect } from 'react';
import { Job } from '@auto-buyer-shared/types'

export function useJobEvents(setMessages, job, setRunning) {

    useEffect(() => {
        window.electron.on(`job-tick-${job.name}`, (_, data: Job) => {
          setMessages((oldMsg) => oldMsg + '.');
          if (!job.running) {
            job.running = true;
            setRunning(() => true);
          }
        });
    
        window.electron.on(`job-error-${job.name}`, (_, data: {job: Job, error: any}) => {
          console.log('error: ', data.error);
          setMessages((oldMsg) => oldMsg + JSON.stringify(data.error));
        });
    
        window.electron.on(`job-status-${job.name}`, (_, data: {job: Job, status: any}) => {
          console.log('error: ', data.status);
          setMessages((oldMsg) => oldMsg + JSON.stringify(data.status));
        });
    
        window.electron.on(`job-continue-${job.name}`, (_, data) => {
          setMessages((oldMsg) => oldMsg + 'continue?');
        });
      }, []);
}