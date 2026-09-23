App({
  globalData: { version: '0.2.0' },
  onLaunch() {
    const update = wx.getUpdateManager && wx.getUpdateManager();
    if (update) update.onUpdateReady(() => update.applyUpdate());
  },
});
