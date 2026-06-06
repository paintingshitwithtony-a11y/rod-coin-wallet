import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, CheckSquare } from 'lucide-react';

export default function WalletBulkActions({ selectedCount, removableCount, deleting, onSelectAll, onClear, onDelete }) {
    return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/60">
            <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckSquare className="w-4 h-4 text-purple-400" />
                <span>{selectedCount} selected</span>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
                <Button size="sm" variant="outline" onClick={onSelectAll} disabled={removableCount === 0} className="border-slate-700 text-slate-300">
                    Select All
                </Button>
                {selectedCount > 0 && (
                    <Button size="sm" variant="ghost" onClick={onClear} className="text-slate-400 hover:text-white">
                        Clear
                    </Button>
                )}
                <Button size="sm" onClick={onDelete} disabled={selectedCount === 0 || deleting} className="bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? 'Removing...' : `Remove ${selectedCount || ''}`}
                </Button>
            </div>
        </div>
    );
}