import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  category?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload: NotificationPayload = await req.json()
    console.log('Received notification request:', payload)

    // Step A: Check master toggle status
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('setting_value')
      .eq('setting_key', 'master_toggle')
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'Failed to check notification settings' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!settings?.setting_value) {
      console.log('Notifications are disabled (master toggle is OFF)')
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'Notifications are disabled' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step B: Check category - only proceed for specific categories
    const allowedCategories = ['أخبار وتقارير', 'عاجل']
    const category = payload.category || ''
    
    if (!allowedCategories.includes(category)) {
      console.log(`Category "${category}" is not in allowed list, skipping notification`)
      return new Response(JSON.stringify({ 
        success: false, 
        reason: `Category "${category}" is not eligible for notifications` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Category "${category}" is allowed, proceeding with notification`)

    // Step C: Get all push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError)
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'Failed to fetch subscriptions' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`)

    // Note: In production, you would use web-push library to send actual push notifications
    // For now, we'll return success and rely on realtime subscriptions on the client
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Notification triggered',
      category: category,
      subscriptionsCount: subscriptions?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in send-notification:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
