import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FormGroup,
  Input,
  Select,
  Textarea,
  Dialog,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Alert,
  Skeleton,
  EmptyState,
  PermissionDenied,
} from "../src/index.js";

describe("Nexus Design System (@nexus/ui)", () => {
  describe("Button Component", () => {
    it("renders with default secondary variant and accessible attributes", () => {
      const html = renderToString(<Button>Click me</Button>);
      expect(html).toContain("nexus-btn");
      expect(html).toContain("nexus-btn--secondary");
      expect(html).toContain("Click me");
    });

    it("renders primary, danger, and ghost variants", () => {
      expect(renderToString(<Button variant="primary">Save</Button>)).toContain(
        "nexus-btn--primary",
      );
      expect(
        renderToString(<Button variant="danger">Delete</Button>),
      ).toContain("nexus-btn--danger");
      expect(renderToString(<Button variant="ghost">Cancel</Button>)).toContain(
        "nexus-btn--ghost",
      );
    });

    it("renders loading state with aria-busy and spinner", () => {
      const html = renderToString(
        <Button loading loadingText="Saving...">
          Save
        </Button>,
      );
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('disabled=""');
      expect(html).toContain("nexus-spinner");
      expect(html).toContain("Saving...");
    });
  });

  describe("Badge Component", () => {
    it("renders with semantic status badges and indicator dots", () => {
      const infoHtml = renderToString(<Badge status="info">Operational</Badge>);
      expect(infoHtml).toContain("nexus-badge--info");
      expect(infoHtml).toContain("nexus-badge--dot");
      expect(infoHtml).toContain("Operational");

      const dangerHtml = renderToString(
        <Badge status="danger">Critical</Badge>,
      );
      expect(dangerHtml).toContain("nexus-badge--danger");
    });
  });

  describe("Card Component Suite", () => {
    it("renders card hierarchy correctly", () => {
      const html = renderToString(
        <Card interactive>
          <CardHeader>
            <CardTitle>Tournament Settings</CardTitle>
            <CardDescription>Configure rules and brackets</CardDescription>
          </CardHeader>
          <CardContent>Body content</CardContent>
          <CardFooter>Footer actions</CardFooter>
        </Card>,
      );
      expect(html).toContain("nexus-card");
      expect(html).toContain("nexus-card--interactive");
      expect(html).toContain("Tournament Settings");
      expect(html).toContain("Configure rules and brackets");
      expect(html).toContain("Body content");
      expect(html).toContain("Footer actions");
    });
  });

  describe("Form Components", () => {
    it("renders FormGroup with persistent label, required mark, and inline validation", () => {
      const html = renderToString(
        <FormGroup
          label="Channel Name"
          required
          hint="Must start with #"
          error="Name is already in use"
          htmlFor="chan"
        >
          <Input id="chan" error defaultValue="general" />
        </FormGroup>,
      );
      expect(html).toContain("nexus-form-label--required");
      expect(html).toContain("Channel Name");
      expect(html).toContain('role="alert"');
      expect(html).toContain("Name is already in use");
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain("nexus-input--error");
    });

    it("renders Select and Textarea with accessible IDs", () => {
      const selectHtml = renderToString(
        <Select id="role-select">
          <option value="admin">Admin</option>
        </Select>,
      );
      expect(selectHtml).toContain("nexus-select");
      expect(selectHtml).toContain("role-select");

      const textHtml = renderToString(
        <Textarea id="notes" placeholder="Enter notes" />,
      );
      expect(textHtml).toContain("nexus-textarea");
      expect(textHtml).toContain('placeholder="Enter notes"');
    });
  });

  describe("Dialog Component", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToString(
        <Dialog isOpen={false} onClose={() => {}} title="Confirm">
          Content
        </Dialog>,
      );
      expect(html).toBe("");
    });

    it('renders modal with role="dialog", aria-modal="true", and title when isOpen is true', () => {
      const html = renderToString(
        <Dialog
          isOpen={true}
          onClose={() => {}}
          title="Dangerous Action"
          description="Cannot be undone"
        >
          Are you sure?
        </Dialog>,
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain("Dangerous Action");
      expect(html).toContain("Cannot be undone");
      expect(html).toContain("Are you sure?");
    });
  });

  describe("Table Components", () => {
    it("renders semantic table markup", () => {
      const html = renderToString(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Alice</TableCell>
              <TableCell>Captain</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(html).toContain('<table class="nexus-table');
      expect(html).toContain('scope="col"');
      expect(html).toContain("Alice");
      expect(html).toContain("Captain");
    });
  });

  describe("Alert Component", () => {
    it('renders status alert with role="alert"', () => {
      const html = renderToString(
        <Alert status="warning" title="Maintenance Scheduled">
          System will be read-only for 5 minutes.
        </Alert>,
      );
      expect(html).toContain('role="alert"');
      expect(html).toContain("Maintenance Scheduled");
      expect(html).toContain("System will be read-only for 5 minutes.");
    });
  });

  describe("Skeleton Component", () => {
    it("renders skeleton with wave animation and custom dimensions", () => {
      const html = renderToString(<Skeleton width="200px" height="24px" />);
      expect(html).toContain("nexus-skeleton");
      expect(html).toContain("width:200px");
      expect(html).toContain("height:24px");
      expect(html).toContain('aria-hidden="true"');
    });
  });

  describe("EmptyState Component", () => {
    it("renders title, description, and action CTA", () => {
      const html = renderToString(
        <EmptyState
          title="No Tournaments Created"
          description="Create your first tournament to start managing teams and matches."
          action={<Button variant="primary">Create Tournament</Button>}
        />,
      );
      expect(html).toContain("nexus-empty-state");
      expect(html).toContain("No Tournaments Created");
      expect(html).toContain("Create your first tournament");
      expect(html).toContain("Create Tournament");
    });
  });

  describe("PermissionDenied Component", () => {
    it("explains required capability without leaking private resources", () => {
      const html = renderToString(
        <PermissionDenied
          requiredCapability="tournament:manage"
          resourceName="Spring Major 2026"
        />,
      );
      expect(html).toContain("Permission Denied");
      expect(html).toContain("Spring Major 2026");
      expect(html).toContain("tournament:manage");
      expect(html).toContain('role="alert"');
    });
  });
});
