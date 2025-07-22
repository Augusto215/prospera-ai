@@ .. @@
 
 export default function TestimonialCard({ name, role, content, rating }: TestimonialCardProps) {
   return (
-    <div className="bg-white p-8 rounded-2xl shadow-lg">
+    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md">
       <div className="flex items-center space-x-1 mb-4">
         {[...Array(rating)].map((_, i) => (
           <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
         ))}
       </div>
-      <p className="text-gray-700 mb-6 leading-relaxed">"{content}"</p>
+      <p className="text-gray-700 mb-6 leading-relaxed text-sm sm:text-base">"{content}"</p>
       <div>
         <div className="font-semibold text-gray-800">{name}</div>
         <div className="text-gray-600 text-sm">{role}</div>