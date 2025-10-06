export interface TrainingData {
  id: string;
  recipe: { [key: string]: number };
  metrics: any;
  successScore: number;
  actualOutcome?: number;
  feedback?: string;
  timestamp: Date;
}

export interface RecipeHistory {
  id: string;
  name: string;
  ingredients: { [key: string]: number };
  metrics: any;
  predictions: any;
  actualResults?: any;
  userRating?: number;
  notes?: string;
  createdAt: Date;
}

class DatabaseService {
  private trainingData: TrainingData[] = [];
  private recipeHistory: RecipeHistory[] = [];

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    // Load from localStorage if available
    const storedTraining = localStorage.getItem('meetha_training_data');
    const storedHistory = localStorage.getItem('meetha_recipe_history');

    if (storedTraining) {
      this.trainingData = JSON.parse(storedTraining);
    }

    if (storedHistory) {
      this.recipeHistory = JSON.parse(storedHistory);
    }
  }

  // Training Data Management
  addTrainingData(data: Omit<TrainingData, 'id' | 'timestamp'>): void {
    const trainingEntry: TrainingData = {
      ...data,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    this.trainingData.push(trainingEntry);
    this.saveTrainingData();
  }

  getTrainingData(): TrainingData[] {
    return [...this.trainingData];
  }

  updateTrainingDataWithOutcome(id: string, actualOutcome: number, feedback?: string): void {
    const index = this.trainingData.findIndex(data => data.id === id);
    if (index !== -1) {
      this.trainingData[index].actualOutcome = actualOutcome;
      this.trainingData[index].feedback = feedback;
      this.saveTrainingData();
    }
  }

  // Recipe History Management
  saveRecipe(recipe: Omit<RecipeHistory, 'id' | 'createdAt'>): RecipeHistory {
    const recipeEntry: RecipeHistory = {
      ...recipe,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    this.recipeHistory.push(recipeEntry);
    this.saveRecipeHistory();
    return recipeEntry;
  }

  getRecipeHistory(): RecipeHistory[] {
    return [...this.recipeHistory];
  }

  updateRecipeRating(id: string, rating: number, notes?: string): void {
    const index = this.recipeHistory.findIndex(recipe => recipe.id === id);
    if (index !== -1) {
      this.recipeHistory[index].userRating = rating;
      this.recipeHistory[index].notes = notes;
      this.saveRecipeHistory();
    }
  }

  // Data Export/Import
  exportData(): { trainingData: TrainingData[], recipeHistory: RecipeHistory[] } {
    return {
      trainingData: this.trainingData,
      recipeHistory: this.recipeHistory
    };
  }

  importData(data: { trainingData?: TrainingData[], recipeHistory?: RecipeHistory[] }): void {
    if (data.trainingData) {
      this.trainingData = data.trainingData;
      this.saveTrainingData();
    }
    if (data.recipeHistory) {
      this.recipeHistory = data.recipeHistory;
      this.saveRecipeHistory();
    }
  }

  // Storage methods for draft autosave only
  private saveTrainingData(): void {
    localStorage.setItem('meetha_training_data', JSON.stringify(this.trainingData));
  }

  private saveRecipeHistory(): void {
    localStorage.setItem('meetha_recipe_history', JSON.stringify(this.recipeHistory));
  }

  // Draft autosave helpers (30-second autosave only)
  saveDraftRecipe(draft: any): void {
    localStorage.setItem('meetha_recipe_draft', JSON.stringify({
      ...draft,
      timestamp: Date.now()
    }));
  }

  loadDraftRecipe(): any | null {
    const stored = localStorage.getItem('meetha_recipe_draft');
    if (!stored) return null;
    
    const draft = JSON.parse(stored);
    // Auto-expire drafts older than 24 hours
    if (Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('meetha_recipe_draft');
      return null;
    }
    return draft;
  }

  clearDraftRecipe(): void {
    localStorage.removeItem('meetha_recipe_draft');
  }

  // Analytics
  getPerformanceMetrics(): {
    totalRecipes: number;
    avgSuccessScore: number;
    mostUsedIngredients: { name: string; count: number }[];
    trainingDataSize: number;
  } {
    const totalRecipes = this.recipeHistory.length;
    const avgRating = this.recipeHistory
      .filter(r => r.userRating)
      .reduce((sum, r) => sum + (r.userRating || 0), 0) / 
      this.recipeHistory.filter(r => r.userRating).length || 0;

    const ingredientCounts: { [key: string]: number } = {};
    this.recipeHistory.forEach(recipe => {
      Object.keys(recipe.ingredients).forEach(ingredient => {
        ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
      });
    });

    const mostUsedIngredients = Object.entries(ingredientCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRecipes,
      avgSuccessScore: avgRating,
      mostUsedIngredients,
      trainingDataSize: this.trainingData.length
    };
  }
}

export const databaseService = new DatabaseService();
