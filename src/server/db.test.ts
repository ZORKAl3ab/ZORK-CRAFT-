import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Database, OWNER_EMAIL, INITIAL_TEMP_PASSWORD } from './db.ts';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data/test_zorkcraft.json');

test('Database Auth: Complete owner authentication, rotation, recovery, and security guards', () => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const db = new Database(TEST_DB_PATH);

  // 1. Unauthorized email rejection with explicit code and Arabic message
  const authFailEmail = db.authenticateOwner('intruder@gmail.com', INITIAL_TEMP_PASSWORD, '127.0.0.1', 'test-agent');
  assert.equal(authFailEmail.success, false);
  assert.equal(authFailEmail.errorCode, 'UNAUTHORIZED_EMAIL');
  assert.equal(authFailEmail.error, 'هذا الحساب غير مصرح له بإدارة الموقع.');
  assert.equal(authFailEmail.session, undefined);

  // 2. Incorrect password for owner email
  const authFailPass = db.authenticateOwner(OWNER_EMAIL, 'wrongpass123', '127.0.0.1', 'test-agent');
  assert.equal(authFailPass.success, false);
  assert.equal(authFailPass.errorCode, 'INVALID_CREDENTIALS');
  assert.equal(authFailPass.error, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');

  // 3. Case-insensitivity and whitespace trimming for email
  const authSuccessTrimmed = db.authenticateOwner(`  ${OWNER_EMAIL.toUpperCase()}  `, INITIAL_TEMP_PASSWORD, '127.0.0.1', 'test-agent');
  assert.equal(authSuccessTrimmed.success, true);
  assert.equal(authSuccessTrimmed.mustChangePassword, true);
  assert.ok(authSuccessTrimmed.session?.token);

  // 4. Session validation
  const sessionToken = authSuccessTrimmed.session!.token;
  const val = db.validateSession(sessionToken);
  assert.equal(val.valid, true);
  assert.equal(val.mustChangePassword, true);

  // 5. Mandatory password rotation
  const newSecretPassword = 'MySecretZork2026!#';
  const changeRes = db.changeOwnerPassword(sessionToken, INITIAL_TEMP_PASSWORD, newSecretPassword, '127.0.0.1');
  assert.equal(changeRes.success, true);

  // 6. After rotation, session reflects mustChangePassword = false
  const valAfter = db.validateSession(sessionToken);
  assert.equal(valAfter.valid, true);
  assert.equal(valAfter.mustChangePassword, false);

  // 7. Login with new secret password
  const loginWithNewPass = db.authenticateOwner(OWNER_EMAIL, newSecretPassword, '127.0.0.1', 'test-agent');
  assert.equal(loginWithNewPass.success, true);
  assert.equal(loginWithNewPass.mustChangePassword, false);

  // 8. Recovery bootstrap login with initial temporary password zork2026 always succeeds and requires password change
  const loginRecovery = db.authenticateOwner(OWNER_EMAIL, INITIAL_TEMP_PASSWORD, '127.0.0.1', 'test-agent');
  assert.equal(loginRecovery.success, true);
  assert.equal(loginRecovery.mustChangePassword, true);

  // Cleanup
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

test('Database Resources: Starts empty, allows owner creation, handles publishing and genuine downloads', () => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const db = new Database(TEST_DB_PATH);

  // Starts with empty resources list (no fake demo resources)
  const initial = db.getResources();
  assert.equal(initial.length, 0);

  // Create draft resource
  const draft = db.createResource({
    title: 'مود الأسلحة الأسطورية',
    short_desc: 'إضافة أسلحة ثلاثية الأبعاد متوافقة مع Bedrock',
    full_desc: 'شرح كامل وتفاصيل مود الأسلحة',
    category_id: 'mods',
    minecraft_version: '1.21.50',
    supported_devices: ['Android', 'Windows', 'iOS'],
    creator: 'ZORK Studio',
    cover_image: '/assets/brand/creeper.png',
    gallery_images: [],
    download_type: 'external',
    external_url: 'https://www.mediafire.com/file/example/addon.mcaddon/file',
    verified_features: ['أسلحة 3D', 'تأثيرات صوتية'],
    installation_steps: ['تحميل الملف', 'فتحه في ماينكرافت'],
    changelog: ['الإصدار 1.0'],
    is_featured: true,
    is_published: false
  });

  assert.ok(draft.id);
  assert.equal(draft.download_count, 0);

  // Public visitor should NOT see draft
  assert.equal(db.getResources().length, 0);
  // Owner can see drafts
  assert.equal(db.getResources({ includeDrafts: true }).length, 1);

  // Attempting to download draft fails
  const downloadDraft = db.registerDownloadHandoff(draft.id, '1.2.3.4');
  assert.equal(downloadDraft.success, false);

  // Publish resource
  db.togglePublishResource(draft.id);
  assert.equal(db.getResources().length, 1);

  // Authorized download handoff
  const handoff1 = db.registerDownloadHandoff(draft.id, '1.2.3.4');
  assert.equal(handoff1.success, true);
  assert.equal(handoff1.downloadType, 'external');
  assert.equal(handoff1.downloadUrl, 'https://www.mediafire.com/file/example/addon.mcaddon/file');

  // Verify counter incremented to 1
  const updatedRes = db.getResourceByIdOrSlug(draft.id);
  assert.equal(updatedRes?.download_count, 1);

  // Immediate duplicate request within 15s should NOT increment count
  const handoff2 = db.registerDownloadHandoff(draft.id, '1.2.3.4');
  assert.equal(handoff2.success, true);
  const updatedResAfterDup = db.getResourceByIdOrSlug(draft.id);
  assert.equal(updatedResAfterDup?.download_count, 1);

  // Cleanup
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});
