'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Table, Badge, Alert, Spin, Space } from 'antd';

export default function PaymentGenerationMonitor() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  
  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/system/payments?checkMissed=true');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment generation status');
      }
      
      setStatus(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const generateForMissingMonth = async (month: number, year: number) => {
    setProcessing(true);
    
    try {
      const response = await fetch('/api/system/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ month, year })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger payment generation');
      }
      
      // Refresh status
      await checkStatus();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };
  
  useEffect(() => {
    // Check status on component mount
    checkStatus();
  }, []);
  
  return (
    <Card 
      title="Payment Generation Monitor" 
      extra={<Button onClick={checkStatus} disabled={loading}>Refresh</Button>}
    >
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      
      <Spin spinning={loading}>
        {status && (
          <>
            <p>Last checked: {new Date(status.currentDate).toLocaleString()}</p>
            
            <Table 
              dataSource={status.paymentGenerationStatus} 
              rowKey={(record) => `${record.month}-${record.year}`}
              pagination={false}
              loading={processing}
            >
              <Table.Column 
                title="Month/Year" 
                render={(_, record: any) => `${record.month}/${record.year}`} 
              />
              <Table.Column 
                title="Status" 
                render={(_, record: any) => (
                  <Badge 
                    status={record.complete ? 'success' : (record.generated ? 'warning' : 'error')} 
                    text={record.complete ? 'Complete' : (record.generated ? 'Incomplete' : 'Missing')} 
                  />
                )} 
              />
              <Table.Column 
                title="Count" 
                dataIndex="count" 
              />
              <Table.Column 
                title="Action" 
                render={(_, record: any) => (
                  !record.complete && (
                    <Button 
                      type="primary" 
                      size="small" 
                      onClick={() => generateForMissingMonth(record.month, record.year)}
                      loading={processing}
                    >
                      Generate Now
                    </Button>
                  )
                )} 
              />
            </Table>
          </>
        )}
      </Spin>
    </Card>
  );
}