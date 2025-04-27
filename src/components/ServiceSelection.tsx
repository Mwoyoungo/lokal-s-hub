import React, { useState } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import ServiceDetails from './ServiceDetails';
import { categories } from '@/data/categories';

interface ServiceSelectionProps {
  isOpen: boolean;
  onClose: () => void;
}

const ServiceSelection: React.FC<ServiceSelectionProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
    setShowDetails(true);
  };

  const handleBack = () => {
    if (showDetails) {
      setShowDetails(false);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      onClose();
    }
  };

  const bgColors = [
    'bg-gradient-to-br from-yellow-100 via-white to-yellow-200',
    'bg-gradient-to-br from-blue-100 via-white to-blue-200',
    'bg-gradient-to-br from-green-100 via-white to-green-200',
    'bg-gradient-to-br from-pink-100 via-white to-pink-200',
    'bg-gradient-to-br from-purple-100 via-white to-purple-200',
  ];

  const renderServicesList = (services: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      {services.map((service, idx) => (
        <button
          key={service.id}
          onClick={() => handleServiceSelect(service.id)}
          className={`relative group flex flex-col items-start border-4 border-black rounded-xl p-5 min-h-[180px] max-w-xl mx-auto bg-white shadow-[4px_4px_0_rgba(0,0,0,0.7)] hover:scale-[1.03] hover:shadow-[6px_6px_0_rgba(0,0,0,0.8)] transition-all duration-200 ease-in-out animate-fadeIn`}
          style={{ transitionProperty: 'box-shadow, transform' }}
        >
          <span className="text-3xl mb-2">{service.name.match(/^([\p{Emoji}\w\d\s]+)/u)?.[0]}</span>
          <div className="font-black text-lg mb-1 tracking-tight">{service.name.replace(/^([\p{Emoji}\w\d\s]+)/u, '').trim() || service.name}</div>
          <div className="text-gray-800 text-base mb-1">{service.description}</div>
          <ul className="ml-4 list-disc text-gray-700 text-sm">
            {service.bullets && service.bullets.map((b: string, i: number) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          {/* Icon/emoji fade-in animation */}
          <span className="absolute top-2 right-3 text-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-200">
            {service.name.match(/^([\p{Emoji}\w\d\s]+)/u)?.[0]}
          </span>
        </button>
      ))}
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-black">Choose a Service</h2>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => handleCategorySelect(cat.id)}
          className="w-full bg-white border-4 border-black p-6 rounded-lg text-left shadow-[5px_5px_0px_rgba(0,0,0,0.7)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.6)] transition-all hover:bg-gray-50"
        >
          <h3 className="text-2xl font-black mb-2">{cat.name}</h3>
        </button>
      ))}
    </div>
  );

  const renderCategoryServices = () => {
    const cat = categories.find(c => c.id === selectedCategory);
    if (!cat) return null;
    return (
      <div>
        <h2 className="text-3xl font-black mb-2">{cat.name}</h2>
        <p className="mb-4 text-lg font-medium text-gray-800 bg-white border-2 border-black rounded-lg p-3">
          {cat.description}
        </p>
        {renderServicesList(cat.services)}
      </div>
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent 
        className="bg-white border-t-2 border-gray-200 overflow-y-auto"
      >
        {/* App-like header bar */}
        <div className="sticky top-0 bg-[#FFD700] border-b border-gray-200 px-4 py-3 flex justify-between items-center z-10">
          <Button 
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-white/90 border border-gray-200 shadow-sm hover:bg-white"
          >
            <ChevronDown size={18} />
          </Button>
          <div className="font-bold text-black">
            {showDetails ? 'Service Details' : 
             selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Choose Service'}
          </div>
          <div className="w-9"></div> {/* Empty div for balanced spacing */}
        </div>
        
        {/* Content area with padding */}
        <div className="p-4 pb-6">
          {showDetails ? (
            <ServiceDetails 
              serviceId={selectedService || ''} 
              category={selectedCategory || ''}
              onBack={() => setShowDetails(false)}
              onSubmit={() => onClose()}
            />
          ) : selectedCategory ? (
            renderCategoryServices()
          ) : (
            renderCategories()
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ServiceSelection;
