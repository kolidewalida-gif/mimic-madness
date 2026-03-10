import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BOARD_SPACES, getPropertiesInGroup, GROUP_COLORS, type PropertyGroup } from '@/lib/monopolyBoard';
import { cn } from '@/lib/utils';
import { Home, Building, ArrowDown, ArrowUp } from 'lucide-react';

interface Property {
  property_index: number;
  owner_id: string | null;
  houses: number;
  is_mortgaged: boolean;
}

interface Props {
  properties: Property[];
  myPlayerId: string;
  myMoney: number;
  onBuyHouse: (index: number) => void;
  onMortgage: (index: number) => void;
  isMyTurn: boolean;
}

export function MonopolyPropertyPanel({ properties, myPlayerId, myMoney, onBuyHouse, onMortgage, isMyTurn }: Props) {
  const myProps = properties.filter(p => p.owner_id === myPlayerId);
  
  // Group by property group
  const groups = new Map<string, typeof myProps>();
  myProps.forEach(prop => {
    const space = BOARD_SPACES[prop.property_index];
    const group = space.group || 'other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(prop);
  });

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      <div className="p-3 border-b border-border/30">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Building className="h-4 w-4 text-primary" />
          Mes Propriétés ({myProps.length})
        </h3>
      </div>
      
      <ScrollArea className="h-[500px]">
        <div className="p-3 space-y-3">
          {myProps.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Aucune propriété
            </p>
          )}

          {Array.from(groups.entries()).map(([group, props]) => {
            const groupSpaces = getPropertiesInGroup(group as PropertyGroup);
            const ownsAll = groupSpaces.every(gs => 
              properties.some(p => p.property_index === gs.index && p.owner_id === myPlayerId)
            );
            const color = GROUP_COLORS[group as PropertyGroup] || '#888';

            return (
              <div key={group} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {group}
                    {ownsAll && <span className="text-primary ml-1">★ Monopole</span>}
                  </span>
                </div>
                
                {props.map(prop => {
                  const space = BOARD_SPACES[prop.property_index];
                  const canBuild = ownsAll && space.type === 'property' && prop.houses < 5 && !prop.is_mortgaged;
                  
                  return (
                    <div
                      key={prop.property_index}
                      className={cn(
                        "p-2 rounded-lg border text-xs",
                        prop.is_mortgaged
                          ? "bg-muted/50 border-border/30 opacity-60"
                          : "bg-background border-border/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate flex-1">{space.nameFr.substring(0, 20)}</span>
                        {prop.is_mortgaged && (
                          <span className="text-[10px] bg-destructive/20 text-destructive px-1 rounded">HYPOTHÉQUÉ</span>
                        )}
                      </div>
                      
                      {/* Houses display */}
                      {space.type === 'property' && (
                        <div className="flex items-center gap-1 mb-1.5">
                          {prop.houses === 5 ? (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">🏨 HÔTEL</span>
                          ) : (
                            Array.from({ length: 4 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-3 h-3 rounded-sm border",
                                  i < prop.houses
                                    ? "bg-green-500 border-green-600"
                                    : "bg-muted border-border/30"
                                )}
                              />
                            ))
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {isMyTurn && (
                        <div className="flex gap-1">
                          {canBuild && myMoney >= (space.houseCost || 0) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-1.5"
                              onClick={() => onBuyHouse(prop.property_index)}
                            >
                              <ArrowUp className="h-3 w-3 mr-0.5" />
                              {prop.houses === 4 ? 'Hôtel' : 'Maison'} ({space.houseCost}$)
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-1.5"
                            onClick={() => onMortgage(prop.property_index)}
                          >
                            {prop.is_mortgaged ? (
                              <>
                                <ArrowUp className="h-3 w-3 mr-0.5" />
                                Lever ({Math.floor((space.mortgage || 0) * 1.1)}$)
                              </>
                            ) : (
                              <>
                                <ArrowDown className="h-3 w-3 mr-0.5" />
                                Hypothéquer (+{space.mortgage}$)
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
