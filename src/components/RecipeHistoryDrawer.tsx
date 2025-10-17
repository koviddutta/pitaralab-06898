import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  RotateCcw, 
  GitCompare, 
  Tag, 
  Check, 
  X,
  Loader2 
} from 'lucide-react';
import { getSupabase } from '@/integrations/supabase/safeClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { logEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

interface RecipeVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  name: string;
  label?: string | null;
  rows_json: any;
  metrics?: any;
  created_at: string;
  change_notes?: string;
  profile_version?: string;
  product_type?: string;
}

interface RecipeHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string | null;
  onRestoreVersion: (version: RecipeVersion) => void;
  onCompareVersions: (versions: RecipeVersion[]) => void;
}

export function RecipeHistoryDrawer({
  open,
  onOpenChange,
  recipeId,
  onRestoreVersion,
  onCompareVersions,
}: RecipeHistoryDrawerProps) {
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open && recipeId) {
      loadVersions();
    }
  }, [open, recipeId]);

  const loadVersions = async () => {
    if (!recipeId) return;
    
    setIsLoading(true);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('recipe_versions')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recipe history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLabel = async (versionId: string, label: string) => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from('recipe_versions')
        .update({ label: label.trim() || null })
        .eq('id', versionId);

      if (error) throw error;

      toast({
        title: 'Label saved',
        description: 'Version label updated successfully',
      });

      setEditingLabel(null);
      setLabelInput('');
      loadVersions();
    } catch (error) {
      console.error('Failed to save label:', error);
      toast({
        title: 'Error',
        description: 'Failed to save label',
        variant: 'destructive',
      });
    }
  };

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      // Limit to 3 versions for comparison
      if (prev.length >= 3) {
        toast({
          title: 'Maximum reached',
          description: 'You can compare up to 3 versions at once',
        });
        return prev;
      }
      return [...prev, versionId];
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length < 2) {
      toast({
        title: 'Select versions',
        description: 'Please select at least 2 versions to compare',
      });
      return;
    }

    const versionsToCompare = versions.filter((v) =>
      selectedVersions.includes(v.id)
    );
    
    logEvent(ANALYTICS_EVENTS.VERSION_COMPARE, { 
      count: versionsToCompare.length 
    });
    
    onCompareVersions(versionsToCompare);
    setSelectedVersions([]);
  };

  const handleRestore = (version: RecipeVersion) => {
    logEvent(ANALYTICS_EVENTS.VERSION_RESTORE, {
      version_number: version.version_number,
    });
    
    onRestoreVersion(version);
    toast({
      title: 'Version restored',
      description: `Restored to version ${version.version_number}${version.label ? ` (${version.label})` : ''}`,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recipe History
          </SheetTitle>
          <SheetDescription>
            View, compare, and restore previous versions
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <History className="h-8 w-8 mb-2 opacity-50" />
            <p>No version history available</p>
          </div>
        ) : (
          <>
            {selectedVersions.length >= 2 && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedVersions.length} versions selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedVersions([])}
                    >
                      Clear
                    </Button>
                    <Button size="sm" onClick={handleCompare}>
                      <GitCompare className="h-4 w-4 mr-1" />
                      Compare
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <ScrollArea className="h-[calc(100vh-200px)] mt-4">
              <div className="space-y-3 pr-4">
                {versions.map((version, idx) => (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedVersions.includes(version.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                            v{version.version_number}
                          </Badge>
                          {idx === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {version.profile_version && (
                            <span className="text-xs text-muted-foreground">
                              {version.profile_version}
                            </span>
                          )}
                        </div>

                        {editingLabel === version.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              value={labelInput}
                              onChange={(e) => setLabelInput(e.target.value)}
                              placeholder="Enter version label..."
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveLabel(version.id, labelInput);
                                } else if (e.key === 'Escape') {
                                  setEditingLabel(null);
                                  setLabelInput('');
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveLabel(version.id, labelInput)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingLabel(null);
                                setLabelInput('');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {version.label ? (
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <Tag className="h-3 w-3 text-primary" />
                                <span>{version.label}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingLabel(version.id);
                                  setLabelInput(version.label || '');
                                }}
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                              >
                                <Tag className="h-3 w-3" />
                                Add label
                              </button>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(version.created_at), 'MMM d, yyyy • h:mm a')}
                        </div>

                        {version.change_notes && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {version.change_notes}
                          </p>
                        )}
                      </div>

                      <input
                        type="checkbox"
                        checked={selectedVersions.includes(version.id)}
                        onChange={() => toggleVersionSelection(version.id)}
                        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                      />
                    </div>

                    <div className="flex gap-2 mt-3">
                      {idx !== 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(version)}
                          className="flex-1"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
