const fs = require('fs');
const path = require('path');

const modulesDir = './src/modules';
const modules = fs.readdirSync(modulesDir)
  .filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory())
  .sort();

const moduleDetails = [];
const issuesMap = {};

modules.forEach(module => {
  const modulePath = path.join(modulesDir, module);
  const moduleFile = path.join(modulePath, module + '.module.ts');
  
  if (!fs.existsSync(moduleFile)) return;
  
  const moduleContent = fs.readFileSync(moduleFile, 'utf8');
  const moduleIssues = [];
  
  const appDir = path.join(modulePath, 'application');
  const domainDir = path.join(modulePath, 'domain');
  const infraDir = path.join(modulePath, 'infrastructure');
  const presDir = path.join(modulePath, 'presentation');
  
  // 1. CQRS Module Configuration
  const hasCqrsModule = moduleContent.includes('CqrsModule');
  const hasCommandBusProvider = moduleContent.includes('CommandBus') || moduleContent.includes('CommandHandlers');
  const hasQueryBusProvider = moduleContent.includes('QueryBus') || moduleContent.includes('QueryHandlers');
  
  if (!hasCqrsModule) {
    moduleIssues.push('CqrsModule not imported in module imports');
    addIssue('CqrsModule not imported', module, 'high');
  }
  
  // 2. Application Layer - Queries
  let queryFiles = [];
  let queryHandlerCount = 0;
  if (fs.existsSync(appDir)) {
    const files = fs.readdirSync(appDir, {recursive: true});
    queryFiles = files.filter(f => f.includes('query') && f.endsWith('.ts') && !f.includes('handler'));
    
    // Count query handlers more precisely
    const queryHandlerFiles = files.filter(f => f.includes('query') && f.includes('handler') && f.endsWith('.ts'));
    queryHandlerFiles.forEach(qhf => {
      const qhPath = path.join(appDir, qhf);
      const qhContent = fs.readFileSync(qhPath, 'utf8');
      if (qhContent.includes('IQueryHandler')) queryHandlerCount++;
    });
  }
  
  if (queryFiles.length > 0 && queryHandlerCount === 0) {
    moduleIssues.push(`Found ${queryFiles.length} query files but no IQueryHandler implementations`);
    addIssue('Query files without handlers', module, 'medium');
  }
  
  // 3. Application Layer - Commands
  let commandFiles = [];
  let commandHandlerCount = 0;
  if (fs.existsSync(appDir)) {
    const files = fs.readdirSync(appDir, {recursive: true});
    commandFiles = files.filter(f => f.includes('command') && f.endsWith('.ts') && !f.includes('handler'));
    
    const commandHandlerFiles = files.filter(f => f.includes('command') && f.includes('handler') && f.endsWith('.ts'));
    commandHandlerFiles.forEach(chf => {
      const chPath = path.join(appDir, chf);
      const chContent = fs.readFileSync(chPath, 'utf8');
      if (chContent.includes('ICommandHandler')) commandHandlerCount++;
    });
  }
  
  if (commandFiles.length > 0 && commandHandlerCount === 0) {
    moduleIssues.push(`Found ${commandFiles.length} command files but no ICommandHandler implementations`);
    addIssue('Command files without handlers', module, 'medium');
  }
  
  // 4. Domain Layer
  let hasDomainEntities = false;
  let domainEntityCount = 0;
  if (fs.existsSync(domainDir)) {
    const files = fs.readdirSync(domainDir, {recursive: true});
    const entityFiles = files.filter(f => f.endsWith('.ts') && 
      !f.includes('interface') && !f.includes('dto') && 
      !f.includes('index') && !f.includes('spec'));
    
    hasDomainEntities = entityFiles.length > 0;
    domainEntityCount = entityFiles.length;
  }
  
  if (!hasDomainEntities) {
    moduleIssues.push('Missing domain layer or domain entities');
    addIssue('Missing domain business logic', module, 'high');
  }
  
  // 5. Infrastructure Layer
  let hasRepository = false;
  let repositoryCount = 0;
  let hasMapping = false;
  let ormEntityCount = 0;
  
  if (fs.existsSync(infraDir)) {
    const files = fs.readdirSync(infraDir, {recursive: true});
    const repoFiles = files.filter(f => (f.includes('repository') || f.includes('Repository')) && f.endsWith('.ts'));
    repositoryCount = repoFiles.length;
    hasRepository = repositoryCount > 0;
    
    const mapperFiles = files.filter(f => (f.includes('mapper') || f.includes('Mapper')) && f.endsWith('.ts'));
    hasMapping = mapperFiles.length > 0;
    
    const ormFiles = files.filter(f => (f.includes('entity') || f.includes('Entity') || f.includes('orm')) && f.endsWith('.ts'));
    ormEntityCount = ormFiles.length;
  }
  
  if (!hasRepository && (queryFiles.length > 0 || commandFiles.length > 0)) {
    moduleIssues.push('CQRS queries/commands defined but no TypeORM repository implementation');
    addIssue('Missing TypeORM repository', module, 'high');
  }
  
  if (ormEntityCount > 0 && !hasMapping && domainEntityCount > 0) {
    moduleIssues.push('ORM entities found but no mapping layer to domain entities');
    addIssue('Missing ORM to domain mapping', module, 'medium');
  }
  
  // 6. Presentation Layer
  let hasController = false;
  let controllerUsesRepositoryDirectly = false;
  let controllerUsesServiceAdapter = false;
  let controllerUsesBus = false;
  
  if (fs.existsSync(presDir)) {
    const files = fs.readdirSync(presDir, {recursive: true});
    const controllerFiles = files.filter(f => f.includes('controller') && f.endsWith('.ts'));
    hasController = controllerFiles.length > 0;
    
    if (controllerFiles.length > 0) {
      controllerFiles.forEach(cf => {
        const controllerPath = path.join(presDir, cf);
        const controllerContent = fs.readFileSync(controllerPath, 'utf8');
        
        controllerUsesRepositoryDirectly = controllerContent.includes('Repository') && 
          !controllerContent.includes('ServiceAdapter') && 
          !controllerContent.includes('QueryBus');
        controllerUsesServiceAdapter = controllerContent.includes('ServiceAdapter') || controllerContent.includes('service.adapter');
        controllerUsesBus = controllerContent.includes('QueryBus') || controllerContent.includes('CommandBus');
      });
    }
  }
  
  if (controllerUsesRepositoryDirectly) {
    moduleIssues.push('Controller imports repository directly instead of using service adapter');
    addIssue('Controller uses repository directly', module, 'high');
  }
  
  if (!hasController) {
    moduleIssues.push('Missing presentation controller');
    addIssue('Missing presentation controller', module, 'medium');
  }
  
  // 7. Service Adapter
  let hasServiceAdapter = false;
  let adapterUsesQueryBus = false;
  let adapterUsesCommandBus = false;
  
  if (fs.existsSync(appDir)) {
    const files = fs.readdirSync(appDir, {recursive: true});
    const adapterFiles = files.filter(f => f.includes('adapter') && f.endsWith('.ts'));
    hasServiceAdapter = adapterFiles.length > 0;
    
    if (adapterFiles.length > 0) {
      adapterFiles.forEach(af => {
        const adapterPath = path.join(appDir, af);
        const adapterContent = fs.readFileSync(adapterPath, 'utf8');
        adapterUsesQueryBus = adapterContent.includes('QueryBus');
        adapterUsesCommandBus = adapterContent.includes('CommandBus');
      });
    }
  }
  
  if ((queryFiles.length > 0 || commandFiles.length > 0) && !hasServiceAdapter) {
    moduleIssues.push('CQRS queries/commands defined but no service adapter');
    addIssue('CQRS without service adapter', module, 'high');
  }
  
  // Calculate compliance checks
  const checks = [
    hasCqrsModule,
    queryFiles.length === 0 || queryHandlerCount > 0,
    commandFiles.length === 0 || commandHandlerCount > 0,
    hasDomainEntities,
    hasRepository || (queryFiles.length === 0 && commandFiles.length === 0),
    hasController,
    !controllerUsesRepositoryDirectly,
    (queryFiles.length === 0 && commandFiles.length === 0) || hasServiceAdapter
  ];
  
  const complianceScore = Math.round((checks.filter(c => c).length / checks.length) * 100);
  
  let status;
  if (complianceScore === 100 && moduleIssues.length === 0) {
    status = 'compliant';
  } else if (complianceScore >= 70) {
    status = 'partial';
  } else {
    status = 'non_compliant';
  }
  
  moduleDetails.push({
    name: module,
    compliance_score: complianceScore + '%',
    status: status,
    issues: moduleIssues,
    details: {
      cqrs_configuration: {
        has_cqrs_module: hasCqrsModule,
        has_command_bus_provider: hasCommandBusProvider,
        has_query_bus_provider: hasQueryBusProvider
      },
      queries: {
        query_files: queryFiles.length,
        query_handlers: queryHandlerCount
      },
      commands: {
        command_files: commandFiles.length,
        command_handlers: commandHandlerCount
      },
      domain: {
        has_domain_layer: hasDomainEntities,
        entity_count: domainEntityCount
      },
      infrastructure: {
        has_repository: hasRepository,
        repository_count: repositoryCount,
        orm_entity_count: ormEntityCount,
        has_mapping_layer: hasMapping
      },
      presentation: {
        has_controller: hasController,
        uses_service_adapter: controllerUsesServiceAdapter,
        uses_repository_directly: controllerUsesRepositoryDirectly,
        uses_bus: controllerUsesBus
      },
      service_adapter: {
        has_adapter: hasServiceAdapter,
        adapter_uses_query_bus: adapterUsesQueryBus,
        adapter_uses_command_bus: adapterUsesCommandBus
      }
    }
  });
});

function addIssue(issue, module, severity) {
  if (!issuesMap[issue]) {
    issuesMap[issue] = { modules: [], severity };
  }
  issuesMap[issue].modules.push(module);
}

// Calculate summary
const summary = {
  total_modules: modules.length,
  cqrs_compliant: moduleDetails.filter(m => m.status === 'compliant').length,
  partial_compliance: moduleDetails.filter(m => m.status === 'partial').length,
  non_compliant: moduleDetails.filter(m => m.status === 'non_compliant').length,
  issues_count: moduleDetails.reduce((sum, m) => sum + m.issues.length, 0)
};

// Convert issues map to array and sort
const topIssues = Object.entries(issuesMap)
  .map(([issue, data]) => ({
    issue: issue,
    affected_modules: data.modules.length,
    severity: data.severity,
    modules: data.modules
  }))
  .sort((a, b) => b.affected_modules - a.affected_modules)
  .slice(0, 15);

// Generate recommendations
const recommendations = generateRecommendations(summary, topIssues, modules.length);

const report = {
  summary: summary,
  modules: moduleDetails,
  top_issues: topIssues,
  recommendations: recommendations
};

function generateRecommendations(summary, topIssues, totalModules) {
  const recs = [];
  
  if (summary.non_compliant > 0) {
    recs.push(`Implement CQRS pattern in ${summary.non_compliant} non-compliant modules: ${moduleDetails.filter(m => m.status === 'non_compliant').map(m => m.name).join(', ')}`);
  }
  
  const cqrsIssue = topIssues.find(i => i.issue.includes('CqrsModule'));
  if (cqrsIssue && cqrsIssue.affected_modules > 0) {
    recs.push(`Import CqrsModule in ${cqrsIssue.affected_modules} modules: ${cqrsIssue.modules.slice(0, 5).join(', ')}${cqrsIssue.modules.length > 5 ? '...' : ''}`);
  }
  
  const controllerIssue = topIssues.find(i => i.issue.includes('Controller uses repository'));
  if (controllerIssue && controllerIssue.affected_modules > 0) {
    recs.push(`Refactor ${controllerIssue.affected_modules} controller(s) to use service adapter instead of direct repository injection`);
  }
  
  const adapterIssue = topIssues.find(i => i.issue.includes('CQRS without service adapter'));
  if (adapterIssue && adapterIssue.affected_modules > 0) {
    recs.push(`Create service adapters for ${adapterIssue.affected_modules} modules with CQRS queries/commands`);
  }
  
  const handlerIssue = topIssues.find(i => i.issue.includes('Query files without handlers'));
  if (handlerIssue && handlerIssue.affected_modules > 0) {
    recs.push(`Implement IQueryHandler for ${handlerIssue.affected_modules} modules with unhandled queries`);
  }
  
  const commandIssue = topIssues.find(i => i.issue.includes('Command files without handlers'));
  if (commandIssue && commandIssue.affected_modules > 0) {
    recs.push(`Implement ICommandHandler for ${commandIssue.affected_modules} modules with unhandled commands`);
  }
  
  const repoIssue = topIssues.find(i => i.issue.includes('Missing TypeORM repository'));
  if (repoIssue && repoIssue.affected_modules > 0) {
    recs.push(`Implement TypeORM repositories for ${repoIssue.affected_modules} modules`);
  }
  
  recs.push('Establish standardized CQRS patterns across all modules');
  recs.push('Ensure all domain entities contain business logic, not just data containers');
  recs.push('Create mapping layers between ORM entities and domain entities');
  recs.push('Document and enforce architectural guidelines for DDD/CQRS patterns');
  recs.push('Conduct code reviews to ensure service adapters coordinate all CQRS operations');
  
  return recs;
}

console.log(JSON.stringify(report, null, 2));
