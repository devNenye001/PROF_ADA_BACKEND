"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL || 'https://pcfnpamapfxovctijzts.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZm5wYW1hcGZ4b3ZjdGlqenRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzkwODUsImV4cCI6MjA5Njk1NTA4NX0.ZSSzAr-HoGUnCbRnVoRSVvwZYOSio5EGdEvYaSW4Z9o';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
