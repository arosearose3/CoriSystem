import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Plus, Trash2, MoveVertical, Save } from 'lucide-react';

const PlanDefinitionEditor = () => {
  const [planDefinition, setPlanDefinition] = useState({
    resourceType: 'PlanDefinition',
    trigger: [],
    condition: [],
    action: []
  });

  const [activeSection, setActiveSection] = useState('trigger');
  const [draggedItem, setDraggedItem] = useState(null);

  // Templates for new items
  const templates = {
    trigger: {
      type: 'named-event',
      name: '',
    },
    condition: {
      expression: {
        description: '',
        expression: '',
        language: 'text/fhirpath'
      }
    },
    action: {
      title: '',
      type: 'create',
      resource: '',
      description: ''
    }
  };

  const addItem = (section) => {
    setPlanDefinition(prev => ({
      ...prev,
      [section]: [...prev[section], { ...templates[section] }]
    }));
  };

  const removeItem = (section, index) => {
    setPlanDefinition(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const updateItem = (section, index, field, value) => {
    setPlanDefinition(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) => 
        i === index ? 
          field.includes('.') ?
            { ...item, [field.split('.')[0]]: { ...item[field.split('.')[0]], [field.split('.')[1]]: value }} :
            { ...item, [field]: value }
          : item
      )
    }));
  };

  const handleDragStart = (section, index) => {
    setDraggedItem({ section, index });
  };

  const handleDrop = (section, targetIndex) => {
    if (!draggedItem || draggedItem.section !== section) return;
    
    setPlanDefinition(prev => {
      const items = [...prev[section]];
      const [removed] = items.splice(draggedItem.index, 1);
      items.splice(targetIndex, 0, removed);
      return { ...prev, [section]: items };
    });
    setDraggedItem(null);
  };

  const renderTriggerForm = (trigger, index) => (
    <div className="space-y-4">
      <div>
        <Label>Type</Label>
        <Select 
          value={trigger.type}
          onChange={(e) => updateItem('trigger', index, 'type', e.target.value)}
        >
          <option value="named-event">Named Event</option>
          <option value="data-changed">Data Changed</option>
          <option value="periodic">Periodic</option>
        </Select>
      </div>
      {trigger.type === 'named-event' && (
        <div>
          <Label>Event Name</Label>
          <Input
            value={trigger.name}
            onChange={(e) => updateItem('trigger', index, 'name', e.target.value)}
            placeholder="e.g., patient-admission"
          />
        </div>
      )}
    </div>
  );

  const renderConditionForm = (condition, index) => (
    <div className="space-y-4">
      <div>
        <Label>Description</Label>
        <Input
          value={condition.expression.description}
          onChange={(e) => updateItem('condition', index, 'expression.description', e.target.value)}
          placeholder="e.g., Patient is over 65"
        />
      </div>
      <div>
        <Label>FHIRPath Expression</Label>
        <Input
          value={condition.expression.expression}
          onChange={(e) => updateItem('condition', index, 'expression.expression', e.target.value)}
          placeholder="e.g., Patient.age > 65"
        />
      </div>
    </div>
  );

  const renderActionForm = (action, index) => (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          value={action.title}
          onChange={(e) => updateItem('action', index, 'title', e.target.value)}
          placeholder="e.g., Order Lab Test"
        />
      </div>
      <div>
        <Label>Type</Label>
        <Select
          value={action.type}
          onChange={(e) => updateItem('action', index, 'type', e.target.value)}
        >
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="fire-event">Fire Event</option>
        </Select>
      </div>
      <div>
        <Label>Resource Type</Label>
        <Input
          value={action.resource}
          onChange={(e) => updateItem('action', index, 'resource', e.target.value)}
          placeholder="e.g., ServiceRequest"
        />
      </div>
    </div>
  );

  const renderSection = (section) => (
    <div className="space-y-4">
      {planDefinition[section].map((item, index) => (
        <Card 
          key={index}
          draggable
          onDragStart={() => handleDragStart(section, index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(section, index)}
          className="cursor-move"
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {section.charAt(0).toUpperCase() + section.slice(1)} {index + 1}
            </CardTitle>
            <div className="flex gap-2">
              <MoveVertical className="h-4 w-4" />
              <Trash2
                className="h-4 w-4 cursor-pointer text-red-500"
                onClick={() => removeItem(section, index)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {section === 'trigger' && renderTriggerForm(item, index)}
            {section === 'condition' && renderConditionForm(item, index)}
            {section === 'action' && renderActionForm(item, index)}
          </CardContent>
        </Card>
      ))}
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => addItem(section)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add {section.charAt(0).toUpperCase() + section.slice(1)}
      </Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex gap-2">
        <Button 
          variant={activeSection === 'trigger' ? 'default' : 'outline'}
          onClick={() => setActiveSection('trigger')}
        >
          Triggers
        </Button>
        <Button 
          variant={activeSection === 'condition' ? 'default' : 'outline'}
          onClick={() => setActiveSection('condition')}
        >
          Conditions
        </Button>
        <Button 
          variant={activeSection === 'action' ? 'default' : 'outline'}
          onClick={() => setActiveSection('action')}
        >
          Actions
        </Button>
        <Button className="ml-auto" onClick={() => console.log(planDefinition)}>
          <Save className="mr-2 h-4 w-4" />
          Save PlanDefinition
        </Button>
      </div>
      
      {renderSection(activeSection)}
    </div>
  );
};

export default PlanDefinitionEditor;