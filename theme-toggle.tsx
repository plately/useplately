import { useTheme } from "@/hooks/use-theme";

interface ThemeSelectorProps {
  className?: string;
}

export default function ThemeSelector({ className }: ThemeSelectorProps) {
  const { colorScheme, setColorScheme } = useTheme();
  
  const colorSchemes = [
    { id: "blue", label: "Blue", color: "bg-[#3563E9]", ring: "ring-[#3563E9]" },
    { id: "green", label: "Green", color: "bg-[#22C55E]", ring: "ring-[#22C55E]" },
    { id: "pink", label: "Pink", color: "bg-[#F43F5E]", ring: "ring-[#F43F5E]" },
    { id: "red", label: "Red", color: "bg-[#EF4444]", ring: "ring-[#EF4444]" }
  ];
  
  return (
    <div className={`flex space-x-2 ${className}`}>
      {colorSchemes.map((scheme) => (
        <button
          key={scheme.id}
          onClick={() => setColorScheme(scheme.id as any)}
          aria-label={`Set ${scheme.label} theme`}
          className={`w-5 h-5 rounded-full ${scheme.color} transition-all
            ${colorScheme === scheme.id ? 
              `ring-2 ring-offset-2 ${scheme.ring} dark:ring-offset-gray-900` : 
              'hover:scale-110'
            }`}
        />
      ))}
    </div>
  );
}
