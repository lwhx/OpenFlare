import React, { useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Form, Header, Label, Segment, Table } from 'semantic-ui-react';
import { API, formatDateTime, showError, showSuccess } from '../../helpers';

const initialForm = {
  domain: '',
  cert_id: '',
  enabled: true,
  remark: '',
};

const ManagedDomain = () => {
  const [domains, setDomains] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const loadCertificates = async () => {
    const res = await API.get('/api/tls-certificates/');
    const { success, message, data } = res.data;
    if (success) {
      setCertificates(data || []);
    } else {
      showError(message);
    }
  };

  const loadDomains = async () => {
    setLoading(true);
    const res = await API.get('/api/managed-domains/');
    const { success, message, data } = res.data;
    if (success) {
      setDomains(data || []);
    } else {
      showError(message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCertificates().then();
    loadDomains().then();
  }, []);

  const certificateMap = useMemo(() => {
    const map = new Map();
    certificates.forEach((certificate) => {
      map.set(certificate.id, certificate);
    });
    return map;
  }, [certificates]);

  const certificateOptions = certificates.map((certificate) => ({
    key: certificate.id,
    value: certificate.id,
    text: certificate.name,
  }));

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const submitManagedDomain = async () => {
    setSubmitting(true);
    const payload = {
      domain: form.domain.trim(),
      cert_id: form.cert_id ? Number(form.cert_id) : null,
      enabled: form.enabled,
      remark: form.remark.trim(),
    };
    const res = editingId
      ? await API.put(`/api/managed-domains/${editingId}`, payload)
      : await API.post('/api/managed-domains/', payload);
    const { success, message } = res.data;
    if (success) {
      showSuccess(editingId ? '域名规则已更新' : '域名规则已创建');
      resetForm();
      await loadDomains();
    } else {
      showError(message);
    }
    setSubmitting(false);
  };

  const deleteManagedDomain = async (id) => {
    const res = await API.delete(`/api/managed-domains/${id}`);
    const { success, message } = res.data;
    if (success) {
      showSuccess('域名规则已删除');
      await loadDomains();
    } else {
      showError(message);
    }
  };

  const beginEdit = (domain) => {
    setEditingId(domain.id);
    setForm({
      domain: domain.domain,
      cert_id: domain.cert_id || '',
      enabled: domain.enabled,
      remark: domain.remark || '',
    });
  };

  return (
    <Segment loading={loading}>
      <Header as='h3'>域名管理</Header>
      <p className='page-subtitle'>维护精确域名与通配符域名，并为其绑定默认 TLS 证书。</p>

      <Form onSubmit={submitManagedDomain}>
        <Form.Group widths='equal'>
          <Form.Input
            label='域名'
            placeholder='example.com 或 *.example.com'
            value={form.domain}
            onChange={(e, { value }) => setForm({ ...form, domain: value })}
          />
          <Form.Field
            control={Dropdown}
            selection
            clearable
            label='默认证书'
            placeholder='可选，绑定默认 TLS 证书'
            options={certificateOptions}
            value={form.cert_id}
            onChange={(e, { value }) => setForm({ ...form, cert_id: value || '' })}
          />
        </Form.Group>
        <Form.Group widths='equal'>
          <Form.Input
            label='备注'
            placeholder='可选备注'
            value={form.remark}
            onChange={(e, { value }) => setForm({ ...form, remark: value })}
          />
          <Form.Checkbox
            toggle
            label='启用规则'
            checked={form.enabled}
            onChange={(e, { checked }) => setForm({ ...form, enabled: checked })}
            style={{ alignSelf: 'flex-end', marginBottom: '1rem' }}
          />
        </Form.Group>
        <Button primary type='submit' loading={submitting}>
          {editingId ? '保存修改' : '新增域名'}
        </Button>
        {editingId ? (
          <Button type='button' onClick={resetForm}>
            取消编辑
          </Button>
        ) : null}
      </Form>

      <Table celled stackable className='atsf-table'>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>域名</Table.HeaderCell>
            <Table.HeaderCell>绑定证书</Table.HeaderCell>
            <Table.HeaderCell>状态</Table.HeaderCell>
            <Table.HeaderCell>备注</Table.HeaderCell>
            <Table.HeaderCell>更新时间</Table.HeaderCell>
            <Table.HeaderCell>操作</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {domains.map((domain) => {
            const certificate = domain.cert_id ? certificateMap.get(domain.cert_id) : null;
            return (
              <Table.Row key={domain.id}>
                <Table.Cell>{domain.domain}</Table.Cell>
                <Table.Cell>{certificate ? certificate.name : '未绑定'}</Table.Cell>
                <Table.Cell>
                  {domain.enabled ? <Label color='green'>启用</Label> : <Label>停用</Label>}
                </Table.Cell>
                <Table.Cell>{domain.remark || '无'}</Table.Cell>
                <Table.Cell>{formatDateTime(domain.updated_at)}</Table.Cell>
                <Table.Cell>
                  <Button size='small' onClick={() => beginEdit(domain)}>
                    编辑
                  </Button>
                  <Button size='small' negative onClick={() => deleteManagedDomain(domain.id)}>
                    删除
                  </Button>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </Segment>
  );
};

export default ManagedDomain;
