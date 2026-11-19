import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Tag, Filter, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { useLanguage } from '../../context/LanguageContext';

export function StitchCategoryFilter({
  categories = [],
  selectedCategory,
  onSelectCategory,
  selectedDateFilter,
  onSelectDateFilter,
  totalEventsCount,
}) {
  const { t } = useLanguage();

  const getCategoryLabel = (cat) => {
    const slugMap = {
      'live-music': 'filter.liveMusic',
      'music': 'filter.liveMusic',
      'food-drinks': 'filter.foodDrinks',
      'food-drink': 'filter.foodDrinks',
      'nightlife': 'filter.nightlife',
      'workshops': 'filter.workshops',
      'workshop': 'filter.workshops',
      'arts-theatre': 'filter.artsTheatre',
      'art-theatre': 'filter.artsTheatre',
      'sports-fitness': 'filter.sportsFitness',
      'sports': 'filter.sportsFitness',
      'comedy-shows': 'filter.comedyShows',
      'comedy': 'filter.comedyShows',
      'tech-startup': 'filter.techStartup',
      'tech': 'filter.techStartup',
    };
    const key = slugMap[cat.slug] || slugMap[cat.slug?.toLowerCase()];
    return key ? t(key, cat.name) : cat.name;
  };

  const datePills = [
    { id: 'all', label: t('filter.allDates', 'All Dates') },
    { id: 'weekend', label: t('filter.thisWeekend', 'This Weekend') },
    { id: 'today', label: t('filter.today', 'Tonight') },
    { id: 'tomorrow', label: t('filter.tomorrow', 'Tomorrow') },
  ];

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 py-3 font-sans">
      
      {/* Category Tabs with Framer Motion Sliding Pill */}
      <Tabs
        value={selectedCategory || "all"}
        onValueChange={(val) => onSelectCategory(val === "all" ? null : val)}
        className="w-full md:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <TabsList className="bg-white p-1 rounded-full border border-slate-200 shadow-xs flex items-center whitespace-nowrap w-max">
          <TabsTrigger
            value="all"
            activeValue={selectedCategory || "all"}
          >
            <span>{t('filter.allCategories', 'All Events')}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 ml-1">
              {totalEventsCount}
            </span>
          </TabsTrigger>

          {categories.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.slug}
              activeValue={selectedCategory}
            >
              <span>{getCategoryLabel(cat)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Date Quick Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full md:w-auto whitespace-nowrap">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:flex items-center gap-1 mr-1">
          <Calendar className="w-3.5 h-3.5" /> Date:
        </span>
        {datePills.map((d) => {
          const isSelected = (selectedDateFilter || 'all') === d.id;
          return (
            <button
              key={d.id}
              onClick={() => onSelectDateFilter(d.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap ${
                isSelected
                  ? 'bg-[#075985] text-white shadow-sm font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
