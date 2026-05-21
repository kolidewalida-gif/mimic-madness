import { motion } from 'framer-motion';
import { Building, ArrowDown, ArrowUp, Star } from 'lucide-react';
import {
  BOARD_SPACES,
  getPropertiesInGroup,
  GROUP_COLORS,
  type PropertyGroup,
} from '@/lib/monopolyBoard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InkButton, GRAFFITI_TEXT_SHADOW_SM } from '@/components/ink/InkPrimitives';
import { cn } from '@/lib/utils';

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
  /**
   * Map of `property_index` → timestamp of the last pulse trigger. When
   * the value changes, the matching property card glows for 1.5s. Driven
   * by the animation queue's PURCHASE / BUILDING_GROW / MORTGAGE events.
   */
  pulsedTiles?: Record<number, number | undefined>;
}

const PULSE_DURATION_MS = 1500;

export function MonopolyPropertyPanel({
  properties,
  myPlayerId,
  myMoney,
  onBuyHouse,
  onMortgage,
  isMyTurn,
  pulsedTiles,
}: Props) {
  const myProps = properties.filter((p) => p.owner_id === myPlayerId);

  // Group by property group
  const groups = new Map<string, typeof myProps>();
  myProps.forEach((prop) => {
    const space = BOARD_SPACES[prop.property_index];
    const group = space.group || 'other';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(prop);
  });

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
        border: '4px solid #0a0810',
        boxShadow: '0 6px 0 #0a0810',
      }}
    >
      {/* HEADER */}
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{
          background: 'linear-gradient(180deg, rgba(168,85,247,0.25), rgba(168,85,247,0.08))',
          borderBottom: '3px solid #0a0810',
        }}
      >
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-purple-300" strokeWidth={2.5} />
          <h3
            className="text-lg font-black text-white uppercase tracking-wider leading-none"
            style={{
              fontFamily: "'Caveat', cursive",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            MES PROPRIÉTÉS
          </h3>
        </div>
        <span
          className="px-2 py-0.5 rounded-md text-sm font-black leading-none"
          style={{
            background: '#fbbf24',
            color: '#0a0810',
            border: '2px solid #0a0810',
            fontFamily: "'Caveat', cursive",
          }}
        >
          {myProps.length}
        </span>
      </div>

      <ScrollArea className="h-[480px]">
        <div className="p-3 space-y-3">
          {myProps.length === 0 && (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">🏚️</div>
              <p
                className="text-base text-white/50 font-bold"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                Aucune propriété pour l'instant
              </p>
            </div>
          )}

          {Array.from(groups.entries()).map(([group, props], gi) => {
            const groupSpaces = getPropertiesInGroup(group as PropertyGroup);
            const ownsAll = groupSpaces.every((gs) =>
              properties.some(
                (p) => p.property_index === gs.index && p.owner_id === myPlayerId,
              ),
            );
            const color = GROUP_COLORS[group as PropertyGroup] || '#888';

            return (
              <motion.div
                key={group}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.04 }}
                className="space-y-2"
              >
                {/* GROUP HEADER */}
                <motion.div
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl relative"
                  animate={
                    ownsAll
                      ? {
                          boxShadow: [
                            `0 0 0 ${color}44`,
                            `0 0 18px ${color}99`,
                            `0 0 0 ${color}44`,
                          ],
                        }
                      : { boxShadow: 'none' }
                  }
                  transition={
                    ownsAll
                      ? {
                          duration: 1.6,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                      : { duration: 0.2 }
                  }
                  style={{
                    background: `linear-gradient(180deg, ${color}33, ${color}11)`,
                    border: '2px solid #0a0810',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{
                      background: color,
                      border: '1.5px solid #0a0810',
                    }}
                  />
                  <span
                    className="text-xs font-black text-white uppercase tracking-wider leading-none flex-1"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {group}
                  </span>
                  {ownsAll && (
                    <motion.div
                      animate={{ rotate: [-3, 3, -3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                      style={{
                        background: 'linear-gradient(180deg, #fbbf24, #d97706)',
                        border: '1.5px solid #0a0810',
                      }}
                    >
                      <Star className="w-3 h-3 text-white" fill="currentColor" />
                      <span
                        className="text-[10px] font-black text-white uppercase leading-none"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          textShadow: GRAFFITI_TEXT_SHADOW_SM,
                        }}
                      >
                        MONOPOLE
                      </span>
                    </motion.div>
                  )}
                </motion.div>

                {props.map((prop) => {
                  const space = BOARD_SPACES[prop.property_index];
                  const canBuild =
                    ownsAll &&
                    space.type === 'property' &&
                    prop.houses < 5 &&
                    !prop.is_mortgaged;

                  // Pulse trigger from the animation queue. We diff the
                  // incoming timestamp against the local one so a re-render
                  // forwarding the same map doesn't re-fire the pulse.
                  const pulseTs = pulsedTiles?.[prop.property_index];
                  const showPulse =
                    pulseTs !== undefined &&
                    Date.now() - pulseTs < PULSE_DURATION_MS;

                  return (
                    <motion.div
                      key={prop.property_index}
                      whileHover={{ y: -1 }}
                      animate={
                        showPulse
                          ? {
                              boxShadow: [
                                `0 3px 0 #0a0810, 0 0 0 ${color}00`,
                                `0 3px 0 #0a0810, 0 0 24px ${color}cc`,
                                `0 3px 0 #0a0810, 0 0 0 ${color}00`,
                              ],
                            }
                          : { boxShadow: '0 3px 0 #0a0810' }
                      }
                      transition={
                        showPulse
                          ? { duration: PULSE_DURATION_MS / 1000 }
                          : { duration: 0.2 }
                      }
                      className={cn(
                        'rounded-xl overflow-hidden relative',
                        prop.is_mortgaged && 'opacity-60',
                      )}
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: '2.5px solid #0a0810',
                      }}
                    >
                      {/* color stripe + name */}
                      <div
                        className="px-2.5 py-1.5 flex items-center gap-2"
                        style={{
                          background: `linear-gradient(180deg, ${color}55, ${color}11)`,
                        }}
                      >
                        <span
                          className="text-sm font-black text-white truncate flex-1 leading-none"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            textShadow: GRAFFITI_TEXT_SHADOW_SM,
                          }}
                        >
                          {space.nameFr}
                        </span>
                        {prop.is_mortgaged && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase leading-none"
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: '1.5px solid #0a0810',
                              fontFamily: "'Caveat', cursive",
                            }}
                          >
                            HYPO.
                          </span>
                        )}
                      </div>

                      {/* houses display */}
                      {space.type === 'property' && (
                        <div className="px-2.5 py-1.5 flex items-center gap-1">
                          {prop.houses === 5 ? (
                            <span
                              className="text-xs font-black px-2 py-0.5 rounded-md"
                              style={{
                                background:
                                  'linear-gradient(180deg, #ef4444, #b91c1c)',
                                color: 'white',
                                border: '2px solid #0a0810',
                                fontFamily: "'Caveat', cursive",
                                textShadow: GRAFFITI_TEXT_SHADOW_SM,
                              }}
                            >
                              🏨 HÔTEL
                            </span>
                          ) : (
                            Array.from({ length: 4 }).map((_, i) => (
                              <motion.div
                                key={i}
                                initial={i < prop.houses ? { scale: 0 } : false}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 350 }}
                                className="w-4 h-4 rounded-sm"
                                style={{
                                  background:
                                    i < prop.houses
                                      ? 'linear-gradient(180deg, #22c55e, #16a34a)'
                                      : 'rgba(255,255,255,0.06)',
                                  border:
                                    i < prop.houses
                                      ? '1.5px solid #0a0810'
                                      : '1.5px solid rgba(255,255,255,0.15)',
                                }}
                              />
                            ))
                          )}
                          {prop.houses === 0 && (
                            <span
                              className="ml-1 text-[10px] font-bold text-white/40"
                              style={{ fontFamily: "'Caveat', cursive" }}
                            >
                              terrain vide
                            </span>
                          )}
                        </div>
                      )}

                      {/* actions */}
                      {isMyTurn && (
                        <div className="px-2.5 pb-2 flex flex-wrap gap-1.5">
                          {canBuild && myMoney >= (space.houseCost || 0) && (
                            <InkButton
                              onClick={() => onBuyHouse(prop.property_index)}
                              color="#22c55e"
                              size="sm"
                              className="!px-2 !py-1 !text-xs"
                            >
                              <ArrowUp className="w-3 h-3" strokeWidth={3} />
                              {prop.houses === 4 ? 'HÔTEL' : 'MAISON'} ({space.houseCost}$)
                            </InkButton>
                          )}
                          <InkButton
                            onClick={() => onMortgage(prop.property_index)}
                            color={prop.is_mortgaged ? '#06b6d4' : '#f59e0b'}
                            variant="outline"
                            size="sm"
                            className="!px-2 !py-1 !text-xs"
                          >
                            {prop.is_mortgaged ? (
                              <>
                                <ArrowUp className="w-3 h-3" strokeWidth={3} />
                                LEVER ({Math.floor((space.mortgage || 0) * 1.1)}$)
                              </>
                            ) : (
                              <>
                                <ArrowDown className="w-3 h-3" strokeWidth={3} />
                                HYPO. (+{space.mortgage}$)
                              </>
                            )}
                          </InkButton>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
