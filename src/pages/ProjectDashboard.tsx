
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, MessageSquare, ListCheck, Paperclip } from 'lucide-react';

const ProjectDashboard = () => {
  const progress = 65; // Example progress

  return (
    <div className="min-h-screen bg-[#FFD700] p-4">
      <div className="max-w-4xl mx-auto bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.8)]">
        <h1 className="text-3xl font-black mb-6">Project Dashboard</h1>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-4 gap-4 bg-transparent">
            <TabsTrigger 
              value="overview"
              className="data-[state=active]:bg-black data-[state=active]:text-white border-2 border-black"
            >
              <FileText className="mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="chat"
              className="data-[state=active]:bg-black data-[state=active]:text-white border-2 border-black"
            >
              <MessageSquare className="mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="milestones"
              className="data-[state=active]:bg-black data-[state=active]:text-white border-2 border-black"
            >
              <ListCheck className="mr-2" />
              Milestones
            </TabsTrigger>
            <TabsTrigger 
              value="files"
              className="data-[state=active]:bg-black data-[state=active]:text-white border-2 border-black"
            >
              <Paperclip className="mr-2" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="border-2 border-black p-4 rounded-lg">
              <h3 className="font-bold mb-2">Project Progress</h3>
              <Progress value={progress} className="h-4" />
              <p className="mt-2 text-sm">{progress}% Complete</p>
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <ScrollArea className="h-[400px] border-2 border-black rounded-lg p-4">
              <div className="space-y-4">
                {/* Chat messages will go here */}
                <p className="text-center text-gray-500">Chat messages will appear here</p>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="milestones">
            <ScrollArea className="h-[400px] border-2 border-black rounded-lg p-4">
              <div className="space-y-4">
                <div className="p-3 border-2 border-black rounded-lg bg-green-100">
                  <h4 className="font-bold">Project Setup</h4>
                  <p className="text-sm">Completed on April 20, 2025</p>
                </div>
                <div className="p-3 border-2 border-black rounded-lg">
                  <h4 className="font-bold">Development Phase</h4>
                  <p className="text-sm">In progress</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files">
            <div className="border-2 border-black rounded-lg p-4">
              <div className="text-center p-8">
                <Paperclip className="mx-auto mb-4 h-12 w-12" />
                <p className="font-bold">Drag and drop files here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDashboard;
