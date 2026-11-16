import { describe, expect, it } from 'vitest';
import type { AgentAction } from '../types/agent-catalog.types';
import { buildForm, cleanValues, formErrors, formFieldType, formSummary, humanize, pairedInData } from './agent-form.rules';

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const field = (name: string, schema: Record<string, unknown>, required = false) => ({ name, place: 'body' as const, required, schema });
const action = (fields: AgentAction['fields']): AgentAction => ({ operationId: 'X.y', kind: 'write', httpMethod: 'POST', path: '/x', permission: 'x.y', pageKey: null, labelAr: 'إضافة', labelEn: 'Add', hint: null, fields });

describe('The form of an action (FR-152)', () => {
  it('draws each kind of field, and says null for a list or an object', () => {
    expect(formFieldType({ type: 'string' })).toBe('text');
    expect(formFieldType({ type: 'string', maxLength: 5000 })).toBe('longtext');
    expect(formFieldType({ type: 'string', format: 'date' })).toBe('date');
    expect(formFieldType({ type: 'string', format: 'uuid' })).toBe('select');
    expect(formFieldType({ type: 'string', enum: ['a', 'b'] })).toBe('select');
    expect(formFieldType({ anyOf: [{ type: 'integer' }, { type: 'null' }] })).toBe('integer');
    expect(formFieldType({ type: ['boolean', 'null'] })).toBe('boolean');
    expect(formFieldType({ type: 'array', items: {} })).toBeNull();
    expect(formFieldType({ type: 'object' })).toBeNull();
  });

  it('names a field from its camelCase name when the model gave none', () => {
    expect(humanize('nameAr')).toBe('Name ar');
    expect(humanize('is_active')).toBe('Is active');
  });

  it('builds the form: choices from the schema or from the model, optional lists left out, a mandatory one that cannot be drawn means no form', () => {
    const fields = [field('deskId', { type: 'string', format: 'uuid' }, true), field('nameAr', { type: 'string' }, true), field('kind', { type: 'string', enum: ['a', 'b'] }), field('handlers', { type: 'array' })];
    const built = buildForm({ action: action(fields), values: { nameAr: 'س' }, options: { deskId: [{ label: 'التقنية', value: ID }] }, labels: { nameAr: 'الاسم' } });
    expect(built?.fields.map((f) => [f.name, f.type, f.label, f.options?.length])).toEqual([['deskId', 'select', 'Desk id', 1], ['nameAr', 'text', 'الاسم', undefined], ['kind', 'select', 'Kind', 2]]);
    expect(buildForm({ action: action(fields), values: {}, options: {}, labels: {} })).toBeNull();
    expect(buildForm({ action: action([field('items', { type: 'array' }, true)]), values: {}, options: {}, labels: {} })).toBeNull();
  });

  it('keeps an id the assistant already holds out of the form but in the values', () => {
    const built = buildForm({ action: action([field('deskId', { type: 'string', format: 'uuid' }, true), field('name', { type: 'string' }, true)]), values: { deskId: ID }, options: {}, labels: {} });
    expect(built?.fields.map((f) => f.name)).toEqual(['name']);
    expect(built?.values).toEqual({ deskId: ID });
  });

  it('cleans what was typed: a blank is a field left out, a typed number is a number; the mistakes are required and not-on-offer', () => {
    const fields = [{ name: 'n', label: 'N', required: true, type: 'integer' as const }, { name: 'c', label: 'C', required: false, type: 'select' as const, options: [{ label: 'A', value: 'a' }] }, { name: 't', label: 'T', required: false, type: 'text' as const }];
    expect(cleanValues(fields, { keep: 1 }, { n: '5', t: '', c: 'a', zzz: 'ignored' })).toEqual({ keep: 1, n: 5, c: 'a' });
    expect(formErrors(fields, {})).toEqual({ n: 'required' });
    expect(formErrors(fields, { n: 1, c: 'b' })).toEqual({ c: 'invalid_choice' });
  });

  it('writes the confirmation summary with the names of the choices and ticks for yes and no', () => {
    const fields = [{ name: 'd', label: 'Desk', required: true, type: 'select' as const, options: [{ label: 'التقنية', value: ID }] }, { name: 'p', label: 'Personal', required: false, type: 'boolean' as const }];
    expect(formSummary('Add a type', fields, { d: ID, p: false })).toBe('Add a type\nDesk: التقنية\nPersonal: ✗');
  });

  it('FR-140: a choice is real only when its id is in the lookup data right next to its name (a name is never put on another id)', () => {
    const data = [`TicketsController.catalog: {"types":[{"id":"${ID}","nameAr":"الدعم الفني"},{"id":"11111111-1111-4111-8111-111111111111","nameAr":"طلب صيانة"}]}`];
    expect(pairedInData({ label: 'الدعم  الفني', value: ID }, data)).toBe(true);
    expect(pairedInData({ label: 'طلب صيانة', value: '11111111-1111-4111-8111-111111111111'.toUpperCase() }, data)).toBe(true);
    expect(pairedInData({ label: 'طلب صيانة', value: ID }, data)).toBe(false);
    // A brace inside a name is part of the name, not the end of the record.
    const braced = [`[{"id":"${ID}","nameAr":"الدعم } الفني"}]`];
    expect(pairedInData({ label: 'الدعم } الفني', value: ID }, braced)).toBe(true);
    expect(pairedInData({ label: 'الدعم { الفني', value: ID }, [`[{"nameAr":"x { y","id":"${ID}"}]`])).toBe(false);
    expect(pairedInData({ label: 'اسم لا وجود له', value: ID }, data)).toBe(false);
    expect(pairedInData({ label: 'الدعم الفني', value: '22222222-2222-4222-8222-222222222222' }, data)).toBe(false);
  });
  it('FR-140: a name beside another record\'s id is not paired with it (adjacent records, truncated data)', () => {
    const B = '11111111-1111-4111-8111-111111111111';
    const data = [`TicketsController.catalog: {"types":[{"id":"${ID}","nameAr":"أ"},{"id":"${B}","nameAr":"الدعم الفني"}]}`];
    expect(pairedInData({ label: 'الدعم الفني', value: ID }, data)).toBe(false);
    expect(pairedInData({ label: 'الدعم الفني', value: B }, data)).toBe(true);
    const cut = [`TicketsController.catalog: {"types":[{"id":"${ID}","nameAr":"أ"},{"id":"${B}","nameAr":"الدعم الفني"},{"id":"3333`];
    expect(pairedInData({ label: 'الدعم الفني', value: ID }, cut)).toBe(false);
    expect(pairedInData({ label: 'الدعم الفني', value: B }, cut)).toBe(true);
  });
});
