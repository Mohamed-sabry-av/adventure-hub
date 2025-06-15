# Maintenance Mode

This feature allows you to put the entire site into maintenance mode, showing a beautiful maintenance page with WhatsApp contact information to all users.

## How It Works

1. When maintenance mode is enabled, all routes are guarded by the `maintenanceGuard`
2. Users trying to access any page will be redirected to the maintenance page
3. The maintenance page displays:
   - The site logo
   - A message about the site being under maintenance
   - A WhatsApp button for contacting support

## Bypassing Maintenance Mode

For testing or administrative purposes, you can bypass the maintenance mode by:

1. Adding `?bypass_maintenance=true` to any URL
   - Example: `https://yoursite.com/?bypass_maintenance=true`
2. Once added, the bypass will be stored in session storage and maintained until the session ends

## Enabling/Disabling Maintenance Mode

To toggle maintenance mode:

1. Navigate to `/admin/maintenance-config`
2. Use the toggle switch to enable or disable maintenance mode
3. Changes take effect immediately

## Implementation Details

- The maintenance state is managed by `MaintenanceService`
- All routes are protected by `maintenanceGuard`
- The maintenance page uses the existing WhatsApp button component
- The configuration is simple and doesn't require complex setup 