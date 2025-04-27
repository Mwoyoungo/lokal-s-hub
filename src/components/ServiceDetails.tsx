import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Paperclip, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

interface ServiceDetailsProps {
  serviceId: string;
  category: string;
  onBack: () => void;
  onSubmit: () => void;
}

interface FileAttachment {
  name: string;
  size: number;
  id: string;
}

const ServiceDetails: React.FC<ServiceDetailsProps> = ({ serviceId, category, onBack, onSubmit }) => {
  // Only two steps: 1. Description & Attachments, 2. Review & Submit
  const [step, setStep] = useState(1);
  const [siteSize, setSiteSize] = useState('medium');
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [projectDescription, setProjectDescription] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(15); // Default zoom


  // Service descriptions
  const getServiceDescription = () => {
    if (category === 'web') {
      switch (serviceId) {
        case 'custom_system':
          return 'Fully custom system or feature-heavy platform (e.g., custom dashboards, admin panels, special integrations)';
        case 'basic_info':
          return 'No login system; just informational pages like Home, About, Contact';
        case 'ecommerce':
          return 'Online store with product listings, shopping cart, payment integration';
        default:
          return '';
      }
    } else if (category === 'app') {
      switch (serviceId) {
        case 'custom_app':
          return 'Entirely new concept, requires design, development, and possibly complex features';
        case 'simple_utility':
          return 'One-screen apps like notes, to-do lists, reminders';
        case 'location_app':
          return 'Uses maps, live tracking, or finds people nearby';
        default:
          return '';
      }
    }
    return '';
  };

  // Get service name based on serviceId
  const getServiceName = () => {
    if (category === 'web') {
      switch (serviceId) {
        case 'custom_system': return '💻 Custom System';
        case 'basic_info': return '🔤 Basic Info Website';
        case 'ecommerce': return '🛒 E-Commerce Store';
        default: return 'Unknown Service';
      }
    } else if (category === 'app') {
      switch (serviceId) {
        case 'custom_app': return '📱 Custom App Idea';
        case 'simple_utility': return '🧰 Simple Utility App';
        case 'location_app': return '🗺️ Location-Based App';
        default: return 'Unknown Service';
      }
    }
    return 'Unknown Service';
  };

  const calculatePrice = () => {
    // Web Development Pricing
    if (category === 'web') {
      switch (serviceId) {
        case 'custom_system':
          return 3500;
        case 'basic_info':
          switch (siteSize) {
            case 'small': return 800;
            case 'medium': return 1000;
            case 'large': return 1200;
            default: return 1000;
          }
        case 'ecommerce':
          return 4000;
        default: return 0;
      }
    } 
    // App Development Pricing
    else if (category === 'app') {
      switch (serviceId) {
        case 'custom_app':
          return 5200;
        case 'simple_utility':
          return 1500;
        case 'location_app':
          return 6500;
        default: return 0;
      }
    }
    return 0;
  };

  const nextStep = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const handleFindProvider = async () => {
    setLoading(true);
    setMapZoom(10); // Zoom out
    try {
      // get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not authenticated');
      
      // get position
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true });
      });
      
      // Format location as PostgreSQL geography point
      const longitude = pos.coords.longitude;
      const latitude = pos.coords.latitude;
      const location = `POINT(${longitude} ${latitude})`;
      
      // Save file attachment info to local storage or later retrieval
      // (since there's no attachments column in the schema)
      if (fileAttachments.length > 0) {
        localStorage.setItem(`attachments_${userId}_${new Date().getTime()}`, 
          JSON.stringify(fileAttachments.map(f => f.name)));
      }
      
      // insert request - only using fields that exist in the schema
      const { data, error } = await supabase.from('service_requests').insert({
        client_id: userId,
        service_type: serviceId,
        description: projectDescription,
        location,  // Using PostgreSQL geography point format
        budget: calculatePrice(),
        status: 'pending'
        // created_at and matched_developer_id will be handled by defaults/later updates
      }).select();
      
      if (error) throw error;
      
      console.log('Service request created:', data);
      toast.success('Request submitted! Finding providers near you...');
      setLoading(false);
      onSubmit();
    } catch (err: any) {
      setLoading(false);
      console.error('Service request creation failed:', err);
      toast.error(err.message || 'Submission failed');
    }
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: FileAttachment[] = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      id: Math.random().toString(36).substring(7)
    }));
    
    setFileAttachments([...fileAttachments, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFileAttachments(fileAttachments.filter(file => file.id !== id));
  };

  const renderComplexityOptions = () => {
    if (category === 'web' && serviceId === 'basic_info') {
      return (
        <div className="space-y-6">
          <h3 className="text-xl font-bold">How large is your website?</h3>
          <RadioGroup value={siteSize} onValueChange={setSiteSize} className="space-y-4">
            <div className="flex items-center space-x-3 border-2 border-black p-3 rounded-lg bg-white">
              <RadioGroupItem value="small" id="small" />
              <label htmlFor="small" className="font-bold">Small site (1-3 pages)</label>
            </div>
            <div className="flex items-center space-x-3 border-2 border-black p-3 rounded-lg bg-white">
              <RadioGroupItem value="medium" id="medium" />
              <label htmlFor="medium" className="font-bold">Medium site (4-6 pages)</label>
            </div>
            <div className="flex items-center space-x-3 border-2 border-black p-3 rounded-lg bg-white">
              <RadioGroupItem value="large" id="large" />
              <label htmlFor="large" className="font-bold">Larger site (7+ pages)</label>
            </div>
          </RadioGroup>
        </div>
      );
    } 
    else if (serviceId === 'simple_utility') {
      // Simple utility app has fixed pricing, so we'll show a message instead
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Simple Utility App</h3>
          <p className="bg-white border-2 border-black p-4 rounded-lg">
            Simple utility apps have a fixed price of R1,500.
          </p>
        </div>
      );
    }
    else {
      // Default complexity options for other services
      return (
        <div className="space-y-6">
          <h3 className="text-xl font-bold">How complex is your project?</h3>
          <RadioGroup value={complexity} onValueChange={setComplexity} className="space-y-4">
            <div className="flex items-center space-x-3 border-2 border-black p-3 rounded-lg bg-white">
              <RadioGroupItem value="simple" id="simple" />
              <label htmlFor="simple" className="font-bold">
                {category === 'web' && serviceId === 'custom_system' && 'Basic Custom'}
                {category === 'web' && serviceId === 'ecommerce' && 'Simple Store'}
                {category === 'app' && serviceId === 'custom_app' && 'Simple/Basic MVP'}
                {category === 'app' && serviceId === 'location_app' && 'Basic map functionality'}
                {!(category === 'web' && (serviceId === 'custom_system' || serviceId === 'ecommerce')) && 
                 !(category === 'app' && (serviceId === 'custom_app' || serviceId === 'location_app')) && 'Simple'}
              </label>
            </div>
            <div className="flex items-center space-x-3 border-2 border-black p-3 rounded-lg bg-white">
              <RadioGroupItem value="medium" id="medium" />
              <label htmlFor="medium" className="font-bold">
                {category === 'web' && serviceId === 'custom_system' && 'Moderately Complex'}
                {category === 'web' && serviceId === 'ecommerce' && 'Medium Store'}
                {category === 'app' && serviceId === 'custom_app' && 'Moderate complexity'}
                {!(category === 'web' && (serviceId === 'custom_system' || serviceId === 'ecommerce')) && 
                 !(category === 'app' && serviceId === 'custom_app') && 'Medium'}
              </label>
            </div>
            <div className="flex items-center space-x-3 border-2 border-black p-3 rounded-lg bg-white">
              <RadioGroupItem value="complex" id="complex" />
              <label htmlFor="complex" className="font-bold">
                {category === 'web' && serviceId === 'custom_system' && 'Highly Complex'}
                {category === 'web' && serviceId === 'ecommerce' && 'Store with advanced features'}
                {category === 'app' && serviceId === 'custom_app' && 'High complexity or full-scale startup app'}
                {category === 'app' && serviceId === 'location_app' && 'Full-featured with real-time updates and matching'}
                {!(category === 'web' && (serviceId === 'custom_system' || serviceId === 'ecommerce')) && 
                 !(category === 'app' && (serviceId === 'custom_app' || serviceId === 'location_app')) && 'Complex'}
              </label>
            </div>
          </RadioGroup>
        </div>
      );
    }
  };

  const renderFileUpload = () => {
    return (
      <div className="mt-4">
        {/* Attachment header - simple and compact */}
        <div className="flex items-center mb-2">
          <Paperclip size={18} className="mr-2" />
          <span className="font-bold">Attach files (optional)</span>
        </div>
        
        {/* Upload button - compact and Uber-like */}
        <div className="flex mb-3">
          <Input 
            type="file" 
            className="hidden" 
            id="file-upload" 
            onChange={handleFileUpload} 
            multiple
          />
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer flex-1"
          >
            <div className="border-2 border-black bg-white rounded-lg py-2 px-3 text-center hover:bg-gray-50 transition-colors flex items-center justify-center">
              <Paperclip size={16} className="mr-2" />
              <span>Add files</span>
            </div>
          </label>
        </div>
        
        {/* File list - compact and scrollable */}
        {fileAttachments.length > 0 && (
          <div className="border-2 border-black rounded-lg bg-white overflow-hidden mb-4">
            <div className="max-h-[120px] overflow-y-auto">
              {fileAttachments.map(file => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between px-3 py-2 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <Paperclip size={14} className="mr-2 text-gray-600 flex-shrink-0" />
                    <span className="truncate text-sm font-medium">{file.name}</span>
                  </div>
                  <button 
                    onClick={() => removeFile(file.id)} 
                    className="ml-2 p-1 text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Loading overlay spinner */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black opacity-30 animate-fade-in" />
          <div className="z-10 animate-spin rounded-full border-8 border-t-yellow-400 border-b-yellow-400 border-x-black h-16 w-16 shadow-lg" />
          <span className="absolute top-1/2 left-1/2 text-base font-bold text-black z-20" style={{transform:'translate(-50%,-120%)'}}>Finding Developers...</span>
        </div>
      )}

      {/* Compact service info */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 shadow-sm">
        <h2 className="text-lg font-bold mb-1.5">{getServiceName()}</h2>
        <p className="text-sm text-gray-700">{getServiceDescription()}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Progress value={(step / 2) * 100} className="h-2.5 bg-gray-100 border border-gray-200 rounded-full" />
        <div className="flex justify-between mt-1">
          <span className="text-xs font-medium text-gray-600">Details</span>
          <span className="text-xs font-medium text-gray-600">Review</span>
        </div>
      </div>

      {/* Step 1: Project Description and File Uploads */}
      {step === 1 && (
        <div>
          <div>
            <label className="text-sm font-medium mb-1.5 text-gray-700 block">Describe your project or request</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 mb-4"
              rows={3}
              placeholder="Tell us about your needs, goals, or anything important..."
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
            />
          </div>
          
          {renderFileUpload()}
          
          <div className="mt-6">
            <Button 
              onClick={() => { console.log('Get Quote clicked'); nextStep(); }} 
              className="w-full bg-yellow-400 text-black font-bold py-2.5 rounded-lg border border-black/20 shadow-sm hover:bg-yellow-500"
            >
              Get Quote
            </Button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-5">
            {/* Price bubble */}
            <div className="bg-yellow-400 py-3 px-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Estimated Price</span>
                <span className="text-xl font-bold">R{calculatePrice()}</span>
              </div>
            </div>
            
            {/* Request details */}
            <div className="p-4">
              <div className="grid gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Service</div>
                  <div className="text-sm">{getServiceName()}</div>
                </div>
                
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
                  <div className="text-sm">{projectDescription || <span className="italic text-gray-400">(none)</span>}</div>
                </div>
                
                {fileAttachments.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Attachments</div>
                    <div className="text-sm flex flex-wrap gap-1">
                      {fileAttachments.map(f => (
                        <span key={f.id} className="inline-flex items-center bg-gray-100 px-2 py-1 rounded text-xs">
                          <Paperclip size={10} className="mr-1" />{f.name.length > 15 ? f.name.substring(0, 12) + '...' : f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Back
            </Button>
            <Button 
              onClick={handleFindProvider} 
              className="bg-black text-white hover:bg-gray-900 font-bold"
            >
              Find Provider
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetails;
