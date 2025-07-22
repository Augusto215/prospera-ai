@@ .. @@
 
 export default function FeatureCard({ icon: Icon, title, description, color }: FeatureCardProps) {
   return (
   )
 }
-    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
-      <div className={`w-12 h-12 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center mb-6`}>
+    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
+      <div className={`w-12 h-12 ${color.replace('from-', '').replace('to-', '')} rounded-xl flex items-center justify-center mb-6`}>
         <Icon className="h-6 w-6 text-white" />
       </div>
       <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>