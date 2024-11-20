<script>
    import { wsStore } from '$lib/websocketStore';
    
    $: unreadCount = $wsStore.unreadCount;
    
    let visible = true;
    const dismiss = () => {
      visible = false;
    };
  </script>
  
  <div> 
  {#if unreadCount > 0 && visible}
    <!-- Standard -->
    <div class="notification-badge">
      {unreadCount} new messages
    </div>
  
    <!-- Or Circle variant -->
    <div class="notification-badge circle">
      {unreadCount}
    </div>
  
    <!-- Or Dismissible variant -->
    <div class="notification-badge dismissible" on:click={dismiss}>
      {unreadCount} new messages
    </div>
  
    <!-- Or Subtle variant -->
    <div class="notification-badge subtle">
      {unreadCount} new messages
    </div>
  {/if}
 
  </div>

  <style>
  /* Standard notification badge */
.notification-badge {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #ff4444;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

/* Circle badge variant (for numbers) */
.notification-badge.circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* Subtle variant */
.notification-badge.subtle {
  background-color: rgba(255, 68, 68, 0.9);
  backdrop-filter: blur(4px);
}

/* Animation for badge appearance */
@keyframes slideIn {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Optional: Hover effect */
.notification-badge:hover {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}

/* Optional: Dismissible badge */
.notification-badge.dismissible {
  padding-right: 32px;
  cursor: pointer;
}

.notification-badge.dismissible::after {
  content: '×';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  opacity: 0.8;
}

.notification-badge.dismissible:hover::after {
  opacity: 1;
}

</style>

