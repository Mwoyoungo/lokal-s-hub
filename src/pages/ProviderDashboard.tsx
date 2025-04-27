
import { Button } from '@/components/ui/button';

const ProviderDashboard = () => {
  return (
    <div className="min-h-screen bg-[#FFD700] p-6">
      <div className="bg-white border-4 border-black rounded-lg shadow-[8px_8px_0px_rgba(0,0,0,0.7)] p-6">
        <h1 className="text-3xl font-bold mb-6">Provider Dashboard</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 border-2 border-black rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Active Requests</h2>
            <div className="space-y-4">
              <p className="text-gray-600">No active requests at the moment</p>
            </div>
          </div>
          
          <div className="bg-gray-50 border-2 border-black rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Your Services</h2>
            <Button className="bg-black text-white hover:bg-gray-800">
              Add New Service
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
