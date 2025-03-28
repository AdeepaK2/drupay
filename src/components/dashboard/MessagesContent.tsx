import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Types
interface Student {
  _id: string;
  sid: string;
  name: string;
  email: string;
  parent: {
    name: string;
    email: string;
    contactNumber: string;
  };
}

interface ClassStudent {
  sid: string;
  name: string;
  parentEmail?: string;
}

interface Class {
  _id: string;
  classId: string;
  name: string;
  subject: string;
  grade: number;
}

// Add this new type for tracking email status
interface EmailStatus {
  status: 'success' | 'error' | 'none';
  message: string;
  recipients?: number;
  timestamp?: Date;
}

// Add this to your existing interfaces
interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export default function MessagesContent() {
  // Main state
  const [activeTab, setActiveTab] = useState<'email' | 'sms' | 'templates'>('email');
  const [emailView, setEmailView] = useState<'broadcast' | 'individual'>('broadcast');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [singleStudent, setSingleStudent] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  // New states for class students
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);
  const [selectedClassStudents, setSelectedClassStudents] = useState<string[]>([]);
  const [selectAllClassStudents, setSelectAllClassStudents] = useState(false);
  
  // Add new state for email status tracking
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({
    status: 'none',
    message: ''
  });

  // Add these new states
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('');
  const [showSaveTemplate, setShowSaveTemplate] = useState<boolean>(false);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Load classes when component mounts
  useEffect(() => {
    fetchClasses();
  }, []);

  // Load students when component mounts
  useEffect(() => {
    fetchStudents();
  }, []);
  
  // Fetch students when a class is selected
  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
    } else {
      setClassStudents([]);
      setSelectedClassStudents([]);
      setSelectAllClassStudents(false);
    }
  }, [selectedClass]);
  
  // Update selectAll state when all students are individually selected/deselected
  useEffect(() => {
    if (classStudents.length > 0 && selectedClassStudents.length === classStudents.length) {
      setSelectAllClassStudents(true);
    } else {
      setSelectAllClassStudents(false);
    }
  }, [selectedClassStudents, classStudents]);

  // Add this useEffect to load templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await fetch('/api/class');
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      } else {
        toast.error('Failed to load classes');
      }
    } catch (error) {
      toast.error('Error loading classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await fetch('/api/student');
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
      } else {
        toast.error('Failed to load students');
      }
    } catch (error) {
      toast.error('Error loading students');
    } finally {
      setLoadingStudents(false);
    }
  };
  
  const fetchClassStudents = async () => {
    if (!selectedClass) return;
    
    try {
      setLoadingClassStudents(true);
      const response = await fetch(`/api/enrollment?classId=${selectedClass}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch enrollments for this class');
      }
      
      const enrollmentsData = await response.json();
      
      if (!enrollmentsData.enrollments || enrollmentsData.enrollments.length === 0) {
        setClassStudents([]);
        toast.error('No students enrolled in this class');
        return;
      }
      
      // Get details for each enrolled student
      const studentsData = await Promise.all(
        enrollmentsData.enrollments.map(async (enrollment: any) => {
          const studentId = enrollment.student.sid;
          const studentResponse = await fetch(`/api/student?sid=${studentId}`);
          if (studentResponse.ok) {
            const studentData = await studentResponse.json();
            if (studentData.students && studentData.students.length > 0) {
              const student = studentData.students[0];
              return {
                sid: student.sid,
                name: student.name,
                parentEmail: student.parent?.email || 'N/A'
              };
            }
          }
          // Return basic info if detailed fetch fails
          return {
            sid: enrollment.student.sid,
            name: enrollment.student.name,
            parentEmail: 'N/A'
          };
        })
      );
      
      setClassStudents(studentsData);
    } catch (error) {
      toast.error('Error loading class students');
    } finally {
      setLoadingClassStudents(false);
    }
  };

  // Add this function to fetch templates
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch('/api/emailtemplates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      } else {
        toast.error('Failed to load email templates');
      }
    } catch (error) {
      toast.error('Error loading email templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };
  
  const handleClassStudentSelection = (studentId: string) => {
    setSelectedClassStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };
  
  const handleSelectAllClassStudents = () => {
    if (selectAllClassStudents) {
      // Deselect all
      setSelectedClassStudents([]);
      setSelectAllClassStudents(false);
    } else {
      // Select all
      setSelectedClassStudents(classStudents.map(student => student.sid));
      setSelectAllClassStudents(true);
    }
  };

  // Add this function to handle template selection
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    if (templateId) {
      const template = templates.find(t => t._id === templateId);
      if (template) {
        setSubject(template.subject);
        setMessage(template.message);
      }
    }
  };

  // Add this function to save a template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }
    
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    
    try {
      const response = await fetch('/api/emailtemplates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          subject,
          message
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
      
      await fetchTemplates(); // Refresh templates
      setShowSaveTemplate(false);
      setTemplateName('');
      toast.success('Template saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Error saving template');
    }
  };

  // Reset status when changing views or tabs
  useEffect(() => {
    setEmailStatus({
      status: 'none',
      message: ''
    });
  }, [emailView, activeTab]);

  const sendEmail = async () => {
    // Reset any previous status
    setEmailStatus({
      status: 'none',
      message: ''
    });
    
    // Validation
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!message.trim()) {
      toast.error('Message content is required');
      return;
    }

    setLoading(true);
    try {
      if (emailView === 'individual') {
        // Get SIDs of selected students or single student
        const studentIds = singleStudent 
          ? [singleStudent] 
          : selectedStudents;

        if (studentIds.length === 0) {
          toast.error('Please select at least one student');
          setLoading(false);
          return;
        }

        // Send emails to selected students
        const emailPromises = studentIds.map(async (studentId) => {
          const response = await fetch('/api/emailsend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId,
              subject,
              message
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to send email');
          }

          return response.json();
        });

        try {
          // Wait for all emails to be sent
          const results = await Promise.all(emailPromises);
          
          // Set successful status
          setEmailStatus({
            status: 'success',
            message: `${studentIds.length} email${studentIds.length > 1 ? 's' : ''} sent successfully!`,
            recipients: studentIds.length,
            timestamp: new Date()
          });
          
          toast.success(`Email${studentIds.length > 1 ? 's' : ''} sent successfully!`);
        } catch (err: any) {
          // Set error status
          setEmailStatus({
            status: 'error',
            message: err.message || 'Some emails failed to send. Please try again.',
            timestamp: new Date()
          });
          throw err;
        }
      } 
      else {
        // Broadcast email to class
        if (!selectedClass) {
          toast.error('Please select a class');
          setLoading(false);
          return;
        }
        
        // Check if any students are selected in the class
        if (selectedClassStudents.length === 0) {
          toast.error('Please select at least one student from the class');
          setLoading(false);
          return;
        }
        
        try {
          // Send emails to parents of selected students in the class
          const emailPromises = selectedClassStudents.map(async (studentId: string) => {
            try {
              const response = await fetch('/api/emailsend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId,
                  subject,
                  message
                })
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                return { 
                  success: false, 
                  error: errorData.error || 'Failed to send email',
                  studentId 
                };
              }
              
              const result = await response.json();
              return { ...result, studentId };
            } catch (err: any) {
              return { 
                success: false, 
                error: err.message || 'Error sending email',
                studentId 
              };
            }
          });
          
          // Wait for all emails to be processed
          const results = await Promise.all(emailPromises);
          
          // Count successes and failures
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          if (successful > 0) {
            // Set status with details on success/failure counts
            setEmailStatus({
              status: failed === 0 ? 'success' : 'success',
              message: `${successful} of ${results.length} emails sent successfully${failed > 0 ? ` (${failed} failed)` : ''}`,
              recipients: successful,
              timestamp: new Date()
            });
            
            toast.success(`${successful} emails sent to parents`);
          } else {
            // All emails failed
            setEmailStatus({
              status: 'error',
              message: 'Failed to send any emails. Please try again.',
              timestamp: new Date()
            });
            
            toast.error('Failed to send emails');
          }
        } catch (err: any) {
          setEmailStatus({
            status: 'error',
            message: err.message || 'Error processing class emails',
            timestamp: new Date()
          });
          
          toast.error(err.message || 'Error processing class emails');
        }
      }

      // Reset the form
      setSubject('');
      setMessage('');
      setSelectedStudents([]);
      setSingleStudent('');
      
      // Don't reset the class selection or student selections to allow for resending
    } catch (error: any) {
      // Set error status if not already set
      if (emailStatus.status !== 'error') {
        setEmailStatus({
          status: 'error',
          message: error.message || 'Failed to send email',
          timestamp: new Date()
        });
      }
      
      toast.error(error.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  // Add these functions to your MessagesContent component

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/emailtemplates?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }
      
      await fetchTemplates(); // Refresh templates
      toast.success('Template deleted successfully');
      
      // If the deleted template was selected, reset fields
      if (selectedTemplate === id) {
        setSelectedTemplate('');
        setSubject('');
        setMessage('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error deleting template');
    }
  };

  const editTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setSubject(template.subject);
    setMessage(template.message);
  };

  const updateTemplate = async () => {
    if (!editingTemplate) return;
    
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }
    
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    
    try {
      // Fix the API endpoint format to match your route.ts structure
      const response = await fetch(`/api/emailtemplates?id=${editingTemplate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          subject,
          message
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update template');
      }
      
      await fetchTemplates(); // Refresh templates
      setEditingTemplate(null);
      setTemplateName('');
      setSubject('');
      setMessage('');
      setShowSaveTemplate(false); // This line was missing
      toast.success('Template updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Error updating template');
    }
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setSubject('');
    setMessage('');
  };

  const useTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template._id);
    setSubject(template.subject);
    setMessage(template.message);
    setActiveTab('email'); // Switch to email tab
  };

  // Add this function inside your MessagesContent component

  const renderTemplateManager = () => (
    <div className="mt-2">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Email Templates</h3>
      
      {loadingTemplates ? (
        <div className="flex justify-center items-center py-8">
          <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-md">
          <p className="text-gray-500 mb-4">No email templates have been created yet</p>
          <button 
            onClick={() => setShowSaveTemplate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <button 
              onClick={() => {
                setEditingTemplate(null);
                setShowSaveTemplate(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create New Template
            </button>
          </div>
          
          {/* Template Editor */}
          {(editingTemplate || showSaveTemplate) && (
            <div className="mb-8 p-6 border border-blue-200 bg-blue-50 rounded-lg">
              <h4 className="text-md font-medium text-blue-800 mb-4">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name"
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Compose your email template..."
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-40"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowSaveTemplate(false);
                    setTemplateName('');
                    setSubject('');
                    setMessage('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTemplate ? updateTemplate : saveTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          )}
          
          {/* Template List */}
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{template.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.subject.length > 40 ? template.subject.substring(0, 40) + '...' : template.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                      <button 
                        onClick={() => useTemplate(template)}
                        className="text-blue-600 hover:text-blue-900 mx-1"
                      >
                        Use
                      </button>
                      <button 
                        onClick={() => {
                          setEditingTemplate(template);
                          setTemplateName(template.name);
                          setSubject(template.subject);
                          setMessage(template.message);
                          setShowSaveTemplate(false);
                        }}
                        className="text-blue-600 hover:text-blue-900 mx-1"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteTemplate(template._id)}
                        className="text-red-600 hover:text-red-900 mx-1"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="bg-white shadow-md rounded p-6">
      <h2 className="text-xl font-semibold mb-6">Messaging Center</h2>

      {/* Main tabs for Email vs SMS vs Templates */}
      <div className="flex border-b mb-6">
        <button 
          className={`px-4 py-2 mr-2 ${activeTab === 'email' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
          onClick={() => setActiveTab('email')}
        >
          Email
        </button>
        <button 
          className={`px-4 py-2 mr-2 ${activeTab === 'sms' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
          onClick={() => setActiveTab('sms')}
        >
          SMS
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'templates' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      {activeTab === 'email' ? (
        <div className="email-section">
          {/* Email sub-tabs */}
          <div className="flex mb-6">
            <button 
              className={`px-4 py-2 mr-2 rounded-t-lg ${emailView === 'broadcast' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              onClick={() => setEmailView('broadcast')}
            >
              Broadcast to Class
            </button>
            <button 
              className={`px-4 py-2 rounded-t-lg ${emailView === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              onClick={() => setEmailView('individual')}
            >
              Individual Students
            </button>
          </div>

          {/* Email Status Alert */}
          {emailStatus.status !== 'none' && (
            <div className={`mb-6 p-4 rounded-md ${
              emailStatus.status === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                {emailStatus.status === 'success' ? (
                  <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <div>
                  <p className={`font-medium ${
                    emailStatus.status === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {emailStatus.status === 'success' ? 'Success!' : 'Error'}
                  </p>
                  <p className={`text-sm ${
                    emailStatus.status === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {emailStatus.message}
                  </p>
                  {emailStatus.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(emailStatus.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              
              <button 
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                onClick={() => setEmailStatus({ status: 'none', message: '' })}
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Broadcast to class view */}
          {emailView === 'broadcast' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={loadingClasses}
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls.classId}>
                      {cls.name} (Grade {cls.grade} - {cls.subject})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Show students in the selected class */}
              {selectedClass && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Students in this class
                    </label>
                    {classStudents.length > 0 && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="select-all"
                          checked={selectAllClassStudents}
                          onChange={handleSelectAllClassStudents}
                          className="mr-2 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="select-all" className="text-sm text-gray-600">
                          Select All
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <div className="border border-gray-300 rounded-md p-2 max-h-60 overflow-y-auto">
                    {loadingClassStudents ? (
                      <p className="text-center text-gray-500">Loading students...</p>
                    ) : classStudents.length === 0 ? (
                      <p className="text-center text-gray-500">No students found in this class</p>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Select
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Parent Email
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {classStudents.map((student) => (
                            <tr key={student.sid}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input 
                                  type="checkbox"
                                  checked={selectedClassStudents.includes(student.sid)}
                                  onChange={() => handleClassStudentSelection(student.sid)}
                                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {student.sid}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {student.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {student.parentEmail}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Individual students view */}
          {emailView === 'individual' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Individual Student
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={singleStudent}
                  onChange={(e) => setSingleStudent(e.target.value)}
                  disabled={loadingStudents}
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student.sid}>
                      {student.name} (ID: {student.sid})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">OR Select Multiple Students</p>
                <div className="border border-gray-300 rounded-md p-2 max-h-60 overflow-y-auto">
                  {loadingStudents ? (
                    <p className="text-center text-gray-500">Loading students...</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parent Email
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => (
                          <tr key={student._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input 
                                type="checkbox"
                                checked={selectedStudents.includes(student.sid)}
                                onChange={() => handleStudentSelection(student.sid)}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.sid}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.parent?.email || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Email composer - common for both broadcast and individual */}
          <div className="email-composer mt-6">
            {/* Template section - Add this before the subject field */}
            {activeTab === 'email' && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Templates
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showSaveTemplate ? 'Cancel' : 'Save as template'}
                  </button>
                </div>
                
                {showSaveTemplate ? (
                  <div className="p-4 border border-blue-100 bg-blue-50 rounded-md mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Enter template name"
                        className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={saveTemplate}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This will save your current subject and message as a template
                    </p>
                  </div>
                ) : (
                  <select
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                    disabled={loadingTemplates}
                  >
                    <option value="">Select a template or create a new message</option>
                    {templates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input 
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email subject"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-40"
                placeholder="Compose your email message here..."
              />
            </div>

            <button
              onClick={sendEmail}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      ) : activeTab === 'sms' ? (
        <div className="sms-section">
          {/* SMS sub-tabs */}
          <div className="flex mb-6">
            <button 
              className={`px-4 py-2 mr-2 rounded-t-lg ${emailView === 'broadcast' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              onClick={() => setEmailView('broadcast')}
            >
              Broadcast to Class
            </button>
            <button 
              className={`px-4 py-2 rounded-t-lg ${emailView === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              onClick={() => setEmailView('individual')}
            >
              Individual Students
            </button>
          </div>

          {/* Status Alert for SMS */}
          {emailStatus.status !== 'none' && (
            <div className={`mb-6 p-4 rounded-md relative ${
              emailStatus.status === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                {emailStatus.status === 'success' ? (
                  <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <div>
                  <p className={`font-medium ${
                    emailStatus.status === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {emailStatus.status === 'success' ? 'Success!' : 'Error'}
                  </p>
                  <p className={`text-sm ${
                    emailStatus.status === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {emailStatus.message}
                  </p>
                  {emailStatus.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(emailStatus.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              
              <button 
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                onClick={() => setEmailStatus({ status: 'none', message: '' })}
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Broadcast to class view */}
          {emailView === 'broadcast' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={loadingClasses}
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls.classId}>
                      {cls.name} (Grade {cls.grade} - {cls.subject})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Show students in the selected class */}
              {selectedClass && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Students in this class
                    </label>
                    {classStudents.length > 0 && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="select-all-sms"
                          checked={selectAllClassStudents}
                          onChange={handleSelectAllClassStudents}
                          className="mr-2 focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label htmlFor="select-all-sms" className="text-sm text-gray-600">
                          Select All
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <div className="border border-gray-300 rounded-md p-2 max-h-60 overflow-y-auto">
                    {loadingClassStudents ? (
                      <p className="text-center text-gray-500">Loading students...</p>
                    ) : classStudents.length === 0 ? (
                      <p className="text-center text-gray-500">No students found in this class</p>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Select
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Parent Phone
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {classStudents.map((student) => (
                            <tr key={student.sid}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input 
                                  type="checkbox"
                                  checked={selectedClassStudents.includes(student.sid)}
                                  onChange={() => handleClassStudentSelection(student.sid)}
                                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {student.sid}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {student.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {/* Show phone number instead of email for SMS */}
                                {/* This would come from your student data when backend is connected */}
                                +94-XXXXXXXX
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Individual students view */}
          {emailView === 'individual' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Individual Student
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={singleStudent}
                  onChange={(e) => setSingleStudent(e.target.value)}
                  disabled={loadingStudents}
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student.sid}>
                      {student.name} (ID: {student.sid})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">OR Select Multiple Students</p>
                <div className="border border-gray-300 rounded-md p-2 max-h-60 overflow-y-auto">
                  {loadingStudents ? (
                    <p className="text-center text-gray-500">Loading students...</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Parent Phone
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => (
                          <tr key={student._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input 
                                type="checkbox"
                                checked={selectedStudents.includes(student.sid)}
                                onChange={() => handleStudentSelection(student.sid)}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.sid}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {/* Display parent phone number here */}
                              {student.parent?.contactNumber || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SMS composer - common for both broadcast and individual */}
          <div className="sms-composer mt-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                placeholder="Type your SMS message here... (160 characters max per SMS)"
                maxLength={160}
              />
              <div className="flex justify-end mt-2">
                <span className="text-xs text-gray-500">{message.length}/160 characters</span>
              </div>
            </div>

            {/* SMS Options */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Delivery Options</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      id="send-now"
                      name="delivery-option"
                      checked={true}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="send-now" className="ml-2 text-sm font-medium text-gray-700">
                      Send Immediately
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Send messages as soon as you click the send button.
                  </p>
                </div>
                
                <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      id="schedule"
                      name="delivery-option"
                      disabled
                      className="focus:ring-blue-500 h-4 w-4 text-gray-400 border-gray-300"
                    />
                    <label htmlFor="schedule" className="ml-2 text-sm font-medium text-gray-400">
                      Schedule (Coming Soon)
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">
                    Schedule messages to be sent at a later time.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                // Reset any previous status
                setEmailStatus({
                  status: 'none',
                  message: ''
                });
                
                // Validation
                if (!message.trim()) {
                  toast.error('Message content is required');
                  return;
                }
                
                setLoading(true);
                try {
                  if (emailView === 'individual') {
                    // Get SIDs of selected students or single student
                    const studentIds = singleStudent 
                      ? [singleStudent] 
                      : selectedStudents;
              
                    if (studentIds.length === 0) {
                      toast.error('Please select at least one student');
                      setLoading(false);
                      return;
                    }
              
                    // Send batch SMS
                    const response = await fetch('/api/sms', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        studentIds,
                        message,
                        sender: 'DrUPay'
                      })
                    });
              
                    if (!response.ok) {
                      const data = await response.json();
                      throw new Error(data.error || 'Failed to send SMS');
                    }
                    
                    const result = await response.json();
                    
                    // Set status based on results
                    const successful = result.results.filter((r: any) => r.success).length;
                    
                    setEmailStatus({
                      status: successful > 0 ? 'success' : 'error',
                      message: result.message,
                      recipients: successful,
                      timestamp: new Date()
                    });
                    
                    if (successful > 0) {
                      toast.success(`${successful} SMS messages sent successfully`);
                    }
                    
                    if (successful < studentIds.length) {
                      toast.error(`${studentIds.length - successful} SMS messages failed to send`);
                    }
                  } 
                  else {
                    // Broadcast to selected students in class
                    if (!selectedClass) {
                      toast.error('Please select a class');
                      setLoading(false);
                      return;
                    }
                    
                    if (selectedClassStudents.length === 0) {
                      toast.error('Please select at least one student from the class');
                      setLoading(false);
                      return;
                    }
                    
                    // Send batch SMS to selected class students
                    const response = await fetch('/api/sms', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        studentIds: selectedClassStudents,
                        message,
                        sender: 'DrUPay'
                      })
                    });
                    
                    if (!response.ok) {
                      const data = await response.json();
                      throw new Error(data.error || 'Failed to send SMS');
                    }
                    
                    const result = await response.json();
                    
                    // Set status based on results
                    const successful = result.results.filter((r: any) => r.success).length;
                    
                    setEmailStatus({
                      status: successful > 0 ? 'success' : 'error',
                      message: result.message,
                      recipients: successful,
                      timestamp: new Date()
                    });
                    
                    if (successful > 0) {
                      toast.success(`${successful} SMS messages sent successfully`);
                    }
                    
                    if (successful < selectedClassStudents.length) {
                      toast.error(`${selectedClassStudents.length - successful} SMS messages failed to send`);
                    }
                  }
                  
                  // Reset the message but keep selections
                  setMessage('');
                } catch (error: any) {
                  setEmailStatus({
                    status: 'error',
                    message: error.message || 'Failed to send SMS',
                    timestamp: new Date()
                  });
                  
                  toast.error(error.message || 'Failed to send SMS');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Sending...' : 'Send SMS'}
            </button>
            
            <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>SMS charges may apply based on your service provider</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="templates-section">
          {renderTemplateManager()}
        </div>
      )}
    </div>
  );
}