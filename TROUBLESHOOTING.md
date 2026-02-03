# Troubleshooting Ralph

## Common Issues

### Loop Won't Start

**Symptom**: Running `/ralph:loop` doesn't start the loop.

**Solutions**:
1. Verify hooks are enabled in `~/.gemini/settings.json`:
   ```json
   {
     "hooksConfig": {
       "enabled": true
     }
   }
   ```

2. Check that the extension directory is included:
   ```json
   {
     "context": {
       "includeDirectories": ["~/.gemini/extensions/ralph"]
     }
   }
   ```

3. Ensure `jq` is installed:
   - macOS: `brew install jq`
   - Debian/Ubuntu: `sudo apt-get install jq`
   - Fedora/RHEL: `sudo dnf install jq`
   - Arch: `sudo pacman -S jq`

### Loop Won't Stop

**Symptom**: Loop continues even after completion promise is output.

**Solutions**:
1. Verify the promise format is exact: `<promise>YOUR_TEXT</promise>`
2. Check the state file: `cat .gemini/ralph/state.json`
3. Manually cancel: `/ralph:cancel`

### Ghost Loop

**Symptom**: Old loop interferes with new tasks.

**Solution**: The hook should auto-detect this, but you can manually clean up:
```bash
rm -rf .gemini/ralph
```

### Permission Errors

**Symptom**: Scripts fail with permission denied.

**Solution**: Make scripts executable:
```bash
chmod +x ~/.gemini/extensions/ralph/scripts/*.sh
chmod +x ~/.gemini/extensions/ralph/hooks/*.sh
```

## Debugging

### Check Loop Status
```bash
/ralph:status
```

### View State File
```bash
cat .gemini/ralph/state.json | jq
```

### Enable Debug Logging
Add to your prompt:
```
Before each action, output the current iteration number and your plan.
```

## Getting Help

If you encounter issues not covered here:
1. Check the [README](README.md) for configuration details
2. Review test files in `tests/` for expected behavior
3. Open an issue on GitHub with:
   - Your `~/.gemini/settings.json` (redact sensitive info)
   - The command you ran
   - Contents of `.gemini/ralph/state.json` (if exists)
   - Error messages
